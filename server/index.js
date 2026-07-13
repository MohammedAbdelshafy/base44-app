import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import cron from 'node-cron';
import { sendEmailQueue } from './emailSender.js';

const app = express();
const PORT = process.env.PORT || 3002;

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://prgmwljhbjtcjmwnjaao.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Yry4WoVHEnDuFmEcq69qFg_ykkhxVJ3';
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Bawab Signup (replaces Base44 bawabSignup function)
app.post('/api/bawab-signup', async (req, res) => {
  try {
    const { name, phone, address, gps_lat, gps_lng, photo, num_floors, num_apartments, link_user_id, property_type } = req.body;
    const ptype = property_type || 'apartment_building';
    const isApartment = ptype === 'apartment_building';

    if (!name || !phone || !address) {
      return res.status(400).json({ error: 'Missing required fields (name, phone, address)' });
    }
    if (gps_lat == null || gps_lng == null) {
      return res.status(400).json({ error: 'GPS location is required' });
    }

    const { data: building, error: buildError } = await supabase
      .from('buildings')
      .insert({
        name: address,
        address,
        property_type: ptype,
        bawab_name: isApartment ? name : '',
        bawab_phone: isApartment ? phone : '',
        contact_person_name: isApartment ? '' : name,
        contact_person_phone: isApartment ? '' : phone,
        gps_lat: Number(gps_lat),
        gps_lng: Number(gps_lng),
        photo: photo || '',
        num_floors: isApartment && num_floors ? Number(num_floors) : null,
        num_apartments: isApartment && num_apartments ? Number(num_apartments) : null,
        status: 'pickup_requested',
        source: 'bawab_signup',
      })
      .select()
      .single();

    if (buildError) throw buildError;

    if (link_user_id) {
      await supabase.from('users').update({ building_id: building.id }).eq('id', link_user_id);
    }

    res.json({ success: true, building_id: building.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete Self Signup (replaces Base44 completeSelfSignup function)
const KNOWN_ROLES = ['admin', 'ops', 'sales_rep', 'banger', 'data_manager', 'driver', 'warehouse_foreman', 'customer'];

app.post('/api/complete-signup', async (req, res) => {
  try {
    const { user_id, building_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', user_id).single();
    if (userError || !user) return res.status(404).json({ error: 'User not found' });

    // Already has a real role
    if (user.role && KNOWN_ROLES.includes(user.role)) {
      if (building_id) {
        await supabase.from('users').update({ building_id }).eq('id', user_id);
      }
      return res.json({ success: true, role: user.role, changed: false });
    }

    // Admin-invited accounts stay pending
    if (user.invited_by_admin) {
      return res.json({ success: true, role: user.role || 'user', changed: false, pending: true });
    }

    // Check for pending invitation
    const { data: invitations } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', user.email)
      .eq('status', 'pending')
      .limit(1);

    if (invitations && invitations.length > 0) {
      const inv = invitations[0];
      const updateData = { role: inv.intended_role, invited_by_admin: true };
      if (building_id) updateData.building_id = building_id;
      await supabase.from('users').update(updateData).eq('id', user_id);
      await supabase.from('invitations').update({ status: 'accepted', accepted_user_id: user_id }).eq('id', inv.id);
      return res.json({ success: true, role: inv.intended_role, changed: true });
    }

    // Self-signup without a role → assign 'customer'
    const updateData = { role: 'customer' };
    if (building_id) updateData.building_id = building_id;
    await supabase.from('users').update(updateData).eq('id', user_id);
    res.json({ success: true, role: 'customer', changed: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily Operations Summary (replaces Base44 dailyOperationsSummary function)
function todayCairo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers, rows) {
  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
}

app.get('/api/daily-report', async (req, res) => {
  try {
    const date = todayCairo();

    const [pickupsRes, dumpsRes, paymentsRes] = await Promise.all([
      supabase.from('pickups').select('*').eq('date', date),
      supabase.from('dumps').select('*').order('created_date', { ascending: false }).limit(500),
      supabase.from('payments').select('*').eq('payment_date', date),
    ]);

    const pickups = pickupsRes.data || [];
    const dumps = (dumpsRes.data || []).filter(d => d.timestamp && d.timestamp.startsWith(date));
    const payments = paymentsRes.data || [];

    const pickupCsv = rowsToCsv(
      ['building_name', 'status', 'driver', 'completion_time', 'failure_reason'],
      pickups.map(p => [p.building_name || '', p.status || '', p.assigned_driver_name || '', p.completion_timestamp || '', p.failure_reason || ''])
    );

    const dumpCsv = rowsToCsv(
      ['vehicle_name', 'waste_type', 'weight_kg', 'logged_by', 'timestamp'],
      dumps.map(d => [d.vehicle_name || '', d.waste_type || '', d.weight_kg != null ? String(d.weight_kg) : '', d.logged_by_name || '', d.timestamp || ''])
    );

    const paymentCsv = rowsToCsv(
      ['building_name', 'amount', 'collected_by', 'payment_date', 'note'],
      payments.map(p => [p.building_name || '', p.amount != null ? String(p.amount) : '', p.collected_by_name || '', p.payment_date || '', p.note || ''])
    );

    const csvContent = [
      `=== PICKUPS (${pickups.length}) ===`,
      pickupCsv,
      '',
      `=== DUMPS (${dumps.length}) ===`,
      dumpCsv,
      '',
      `=== PAYMENTS (${payments.length}) ===`,
      paymentCsv,
    ].join('\n');

    const summary = [
      `Date: ${date}`,
      `Pickups: ${pickups.filter(p => p.status === 'done').length} done, ${pickups.filter(p => p.status === 'failed').length} failed, ${pickups.filter(p => p.status === 'pending').length} pending`,
      `Dumps: ${dumps.length}`,
      `Payments: ${payments.length} (total: ${payments.reduce((s, p) => s + (p.amount || 0), 0)} EGP)`,
    ].join('\n');

    // Store or update report
    const { data: existing } = await supabase
      .from('daily_reports')
      .select('id')
      .eq('date', date)
      .eq('type', 'operations_summary')
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('daily_reports').update({ csv_content: csvContent, summary }).eq('id', existing[0].id);
    } else {
      await supabase.from('daily_reports').insert({ date, type: 'operations_summary', csv_content: csvContent, summary });
    }

    const mode = req.query.mode || 'download';
    if (mode === 'store_only') {
      return res.json({ ok: true, date, pickups: pickups.length, dumps: dumps.length, payments: payments.length });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="daily_operations_${date}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File Upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const ext = req.file.originalname.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${ext}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
    res.json({ file_url: publicUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add emails to queue
app.post('/api/email-queue', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
    }

    const emails = req.body.emails || [req.body];
    const rows = emails.map(e => ({
      recipient_email: e.recipient_email || e.to || e.email,
      subject: e.subject || '',
      body: e.body || e.message || e.html || '',
      status: 'qued',
    }));

    if (!rows.length || !rows[0].recipient_email) {
      return res.status(400).json({ error: 'recipient_email required' });
    }

    const { data, error } = await supabaseAdmin.from('email_queue').insert(rows).select('id');
    if (error) throw error;

    res.json({ queued: data.length, ids: data.map(r => r.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send Email Queue
app.post('/api/send-email-queue', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
    }

    const result = await sendEmailQueue({ supabase: supabaseAdmin, batchSize: req.body?.batch_size || 50 });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Email Queue status counts
app.get('/api/email-queue-status', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
    }

    const { data, error } = await supabaseAdmin
      .from('email_queue')
      .select('status');

    if (error) throw error;

    const counts = { qued: 0, queo: 0, sent: 0, failed: 0, total: 0 };
    for (const row of data) {
      if (counts[row.status] != null) counts[row.status]++;
      counts.total++;
    }

    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hourly email queue send (runs at the top of every hour)
if (supabaseAdmin) {
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] Starting hourly email queue send...');
    try {
      const result = await sendEmailQueue({ supabase: supabaseAdmin, batchSize: 100 });
      console.log(`[cron] Sent ${result.sent}, failed ${result.failed}, total ${result.total}`);
    } catch (err) {
      console.error('[cron] Email send error:', err.message);
    }
  });
  console.log('[cron] Hourly email send scheduled (at :00 every hour)');
}

app.listen(PORT, () => {
  console.log(`DAWRIX API server running on http://localhost:${PORT}`);
});

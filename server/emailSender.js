import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const nodemailer = await import('nodemailer').then(m => m.default);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://prgmwljhbjtcjmwnjaao.supabase.co';

function getTransporter() {
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass },
  });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function sendEmailQueue({ supabase, batchSize = 100 } = {}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabase) {
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required');
    }
    supabase = createClient(supabaseUrl, serviceRoleKey);
  }

  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || 'noreply@dawrix.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Dawrix';
  const sendDelay = parseInt(process.env.EMAIL_SEND_DELAY_MS || '1500');

  const { data: emails, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'qued')
    .limit(batchSize);

  if (error) throw new Error(`Failed to fetch queue: ${error.message}`);
  if (!emails || emails.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: email.recipient_email,
        subject: email.subject,
        text: email.body,
        html: email.body.includes('<') ? email.body : undefined,
      });

      await supabase
        .from('email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', email.id);

      sent++;
    } catch (err) {
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error: err.message, updated_at: new Date().toISOString() })
        .eq('id', email.id);

      failed++;
    }

    if (sent + failed < emails.length) {
      await delay(sendDelay);
    }
  }

  return { sent, failed, total: emails.length };
}

if (process.argv[1]?.endsWith('emailSender.js')) {
  const result = await sendEmailQueue();
  console.log(JSON.stringify(result));
}

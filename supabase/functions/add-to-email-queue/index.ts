import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('PROJECT_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json();

    const emails = body.emails || [body];

    if (!emails.length) {
      return new Response(JSON.stringify({ error: 'No emails provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const rows = emails.map((e: any) => ({
      recipient_email: e.recipient_email || e.to || e.email,
      subject: e.subject || '',
      body: e.body || e.message || e.html || '',
      status: 'qued',
    }));

    const missing = rows.filter(r => !r.recipient_email);
    if (missing.length) {
      return new Response(JSON.stringify({ error: 'recipient_email is required for all entries', missing }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabase.from('email_queue').insert(rows).select('id');

    if (error) throw error;

    return new Response(JSON.stringify({ queued: data.length, ids: data.map(r => r.id) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

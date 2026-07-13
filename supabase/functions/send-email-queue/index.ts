import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@latest';

const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com';
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465');
const SMTP_USER = Deno.env.get('SMTP_USER')!;
const SMTP_PASS = (Deno.env.get('SMTP_PASS') || '').replace(/\s+/g, '');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || SMTP_USER;
const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'Dawrix';
const SUPABASE_URL = Deno.env.get('PROJECT_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const BATCH_SIZE = parseInt(Deno.env.get('BATCH_SIZE') || '100');

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const { data: emails, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'qued')
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, total: 0 }), { headers: { 'Content-Type': 'application/json' } });
    }

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
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
      } catch (err: any) {
        await supabase
          .from('email_queue')
          .update({ status: 'failed', error: err.message, updated_at: new Date().toISOString() })
          .eq('id', email.id);

        failed++;
      }

      if (sent + failed < emails.length) {
        await delay(1500);
      }
    }

    return new Response(JSON.stringify({ sent, failed, total: emails.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

import { supabase } from './supabaseClient';

export async function queueEmail(recipient_email, subject, body) {
  const { error } = await supabase.functions.invoke('add-to-email-queue', {
    body: { recipient_email, subject, body },
  });
  if (error) throw error;
}

export async function queueEmails(emails) {
  const { error } = await supabase.functions.invoke('add-to-email-queue', {
    body: { emails },
  });
  if (error) throw error;
}

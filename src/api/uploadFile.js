import { supabase } from './supabaseClient';

export async function uploadFile(file) {
  if (!file) return { file_url: null };
  const ext = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${ext}`;
  const filePath = `public/${fileName}`;

  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(filePath, file);

  if (error) {
    console.error('Upload Error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(filePath);

  return { file_url: publicUrl };
}

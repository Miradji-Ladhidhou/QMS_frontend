import { supabase } from './supabase.js';

const DOCUMENTS_BUCKET = 'qms-documents';

export function getDocumentPublicUrl(filePath) {
  if (!filePath) return null;
  const { data } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

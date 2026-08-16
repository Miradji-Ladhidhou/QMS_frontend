import { supabase } from './supabase.js';

const DOCUMENTS_BUCKET = 'qms-documents';
const TENANT_LOGOS_BUCKET = 'tenant-logos';

function getPublicUrl(bucket, path) {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export function getDocumentPublicUrl(filePath) {
  return getPublicUrl(DOCUMENTS_BUCKET, filePath);
}

export function getTenantLogoPublicUrl(logoPath) {
  return getPublicUrl(TENANT_LOGOS_BUCKET, logoPath);
}

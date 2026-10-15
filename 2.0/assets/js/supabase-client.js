import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
export const isConfigured = () => SUPABASE_PUBLISHABLE_KEY !== 'COLE_A_CHAVE_PUBLISHABLE_AQUI';

export function imageUrl(path, bucket = 'product-images') {
  if (/^https?:\/\//i.test(path || '')) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

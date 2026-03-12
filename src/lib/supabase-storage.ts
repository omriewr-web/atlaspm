import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
}

export const BUCKET_NAME = "work-order-photos";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: jpg, png, webp, gif`;
  }
  if (file.size > MAX_SIZE) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`;
  }
  return null;
}

export function getPublicUrl(path: string): string {
  const { data } = getSupabaseAdmin().storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

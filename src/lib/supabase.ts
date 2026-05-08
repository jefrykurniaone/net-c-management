import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
}

// Server-side only client with service role key (bypasses RLS)
// NEVER expose this to the client
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const PAYMENT_PROOFS_BUCKET = "payment-proofs";

/**
 * Upload a file to Supabase Storage and return the public URL.
 * @param file - File buffer or Blob
 * @param path - Storage path, e.g. "payments/userId/filename.jpg"
 * @param contentType - MIME type
 */
export async function uploadPaymentProof(
  file: Buffer | Blob,
  path: string,
  contentType: string
): Promise<{ url: string; path: string }> {
  const { error } = await supabaseAdmin.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

/**
 * Delete a file from Supabase Storage.
 * @param path - Storage path to delete
 */
export async function deletePaymentProof(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

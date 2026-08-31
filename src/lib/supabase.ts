import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');
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
    },
);

export const PAYMENT_PROOFS_BUCKET = 'payment-proofs';
export const AVATARS_BUCKET = 'avatars';
export const LOGOS_BUCKET = 'logos';
export const HERO_IMAGES_BUCKET = 'hero-images';

/**
 * Upload a file to Supabase Storage and return the public URL.
 * @param file - File buffer or Blob
 * @param path - Storage path, e.g. "payments/userId/filename.jpg"
 * @param contentType - MIME type
 */
export async function uploadPaymentProof(
    file: Buffer | Blob,
    path: string,
    contentType: string,
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

/**
 * Upload a user avatar to Supabase Storage and return the public URL.
 * Uses upsert so re-uploading to the same path replaces the old file.
 */
export async function uploadAvatar(
    file: Buffer,
    path: string,
    contentType: string,
): Promise<string> {
    const { error } = await supabaseAdmin.storage
        .from(AVATARS_BUCKET)
        .upload(path, file, { contentType, upsert: true });

    if (error) {
        throw new Error(`Avatar upload failed: ${error.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(path);

    return urlData.publicUrl;
}

/**
 * Upload a community logo to Supabase Storage and return the public URL.
 * Always uploads to a fixed path so the old logo is replaced.
 */
export async function uploadLogo(
    file: Buffer,
    contentType: string,
): Promise<string> {
    const ext = contentType.split('/')[1] ?? 'png';
    const path = `community-logo.${ext}`;

    const { error } = await supabaseAdmin.storage
        .from(LOGOS_BUCKET)
        .upload(path, file, { contentType, upsert: true });

    if (error) {
        throw new Error(`Logo upload failed: ${error.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
        .from(LOGOS_BUCKET)
        .getPublicUrl(path);

    return urlData.publicUrl;
}

/**
 * Every object currently in the hero-images bucket — normally at most one,
 * "one object per community" per the spec (#155). Upload and remove both
 * start by clearing whatever is there, so re-uploading under a different
 * file extension (jpeg replaced by png) never leaves an orphaned object no
 * Settings key points at.
 */
async function clearHeroImageObjects(): Promise<void> {
    const { data, error } = await supabaseAdmin.storage
        .from(HERO_IMAGES_BUCKET)
        .list();

    if (error) {
        throw new Error(`Hero image list failed: ${error.message}`);
    }
    if (!data || data.length === 0) {
        return;
    }

    const { error: removeError } = await supabaseAdmin.storage
        .from(HERO_IMAGES_BUCKET)
        .remove(data.map((object) => object.name));

    if (removeError) {
        throw new Error(`Hero image cleanup failed: ${removeError.message}`);
    }
}

/**
 * Upload the public page's hero photograph and return its public URL.
 * Always uploads to a fixed-name path so the old photograph is replaced.
 */
export async function uploadHeroImage(
    file: Buffer,
    contentType: string,
): Promise<string> {
    const ext = contentType.split('/')[1] ?? 'jpg';
    const path = `community-hero.${ext}`;

    await clearHeroImageObjects();
    const { error } = await supabaseAdmin.storage
        .from(HERO_IMAGES_BUCKET)
        .upload(path, file, { contentType, upsert: true });

    if (error) {
        throw new Error(`Hero image upload failed: ${error.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
        .from(HERO_IMAGES_BUCKET)
        .getPublicUrl(path);

    return urlData.publicUrl;
}

/** Remove the hero photograph from storage. A no-op when none is set. */
export async function deleteHeroImage(): Promise<void> {
    await clearHeroImageObjects();
}

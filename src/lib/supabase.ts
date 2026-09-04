import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { selectSupersededObjectKeys } from '@/lib/storage-retention';

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
 * How many names one listing answers with. Supabase Storage's `list` caps at
 * 100 by default and does not page on its own, so a member holding more
 * stranded files than this keeps the remainder until their next upload.
 */
const AVATAR_LISTING_LIMIT = 100;

/**
 * Clear everything except `writtenKey` from one member's own area of the
 * `avatars` bucket (#303, `docs/adr/0017-storage-object-retention.md`).
 *
 * The listing is taken under `ownerId` and never bucket-wide: the unprefixed
 * `list()` that `clearHeroImageObjects` uses is correct only for a bucket
 * holding one object for the whole community, and reaching for it here would
 * answer with every member's area and remove the whole community's faces on
 * one member's upload.
 *
 * Best-effort by decision rather than by oversight. The replacement is already
 * stored and the member is waiting on the response, so a failed tidy-up is
 * logged and swallowed; the opposite half of that split — a deliberate delete,
 * which reports its failure — is not this path.
 */
async function clearSupersededAvatars(
    ownerId: string,
    writtenKey: string,
): Promise<void> {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(AVATARS_BUCKET)
            .list(ownerId, { limit: AVATAR_LISTING_LIMIT });

        if (error) {
            throw new Error(`Avatar list failed: ${error.message}`);
        }

        const superseded = selectSupersededObjectKeys(
            ownerId,
            (data ?? []).map((object) => object.name),
            writtenKey,
        );
        if (superseded.length === 0) {
            return;
        }

        const { error: removeError } = await supabaseAdmin.storage
            .from(AVATARS_BUCKET)
            .remove(superseded);

        if (removeError) {
            throw new Error(`Avatar cleanup failed: ${removeError.message}`);
        }
    } catch (err) {
        console.error(`[avatars] cleanup for member ${ownerId} failed:`, err);
    }
}

/**
 * Store a member's profile picture and return its public URL, then clear
 * whatever else their own area of the bucket held.
 *
 * The object path is built here rather than accepted from the caller so the
 * listing prefix and the written key can only ever name the same member: no
 * caller can hand this a path outside `ownerId`'s area, and so no caller can
 * point the cleanup at another member's file. A blank `ownerId` would make
 * that prefix the whole bucket, so it is refused before anything is written.
 *
 * A fresh `randomUUID()` name every upload, never a fixed one: the filename
 * carries the image format, so a member switching format writes a second
 * object and overwrites nothing.
 */
export async function uploadAvatar(
    file: Buffer,
    ownerId: string,
    contentType: string,
): Promise<string> {
    if (ownerId.trim().length === 0) {
        throw new TypeError(
            'uploadAvatar: ownerId must be a non-empty member id',
        );
    }

    const ext = contentType.split('/')[1] ?? 'png';
    const path = `${ownerId}/avatar-${randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
        .from(AVATARS_BUCKET)
        .upload(path, file, { contentType, upsert: true });

    if (error) {
        throw new Error(`Avatar upload failed: ${error.message}`);
    }

    // Only once the replacement is stored: clearing first and then failing the
    // upload would leave the member with no picture at all.
    await clearSupersededAvatars(ownerId, path);

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

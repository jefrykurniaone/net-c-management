/**
 * Whether a Proof may go through the framework's image optimiser.
 *
 * The optimiser is not a rendering choice, it is a **host allow-list**. Its
 * default loader looks the URL up in `next.config.ts` `images.remotePatterns`
 * and, on a miss, *throws* — `Invalid src prop … hostname "…" is not configured
 * under images`. That throw happens while the row is rendering, so it is not an
 * `onError` and no designed failure cell can catch it: one Payment carrying an
 * odd Proof URL blanks the whole Payments queue (#88).
 *
 * A surface where money is decided must not be one row of strange data away
 * from a blank page, so the question is asked *before* the optimiser is handed
 * the URL. Anything that is not provably on the public storage host renders
 * unoptimised instead — a plain image, the same box, the same dialog, and a
 * genuine load failure that now reaches `onError` like any other.
 *
 * This mirrors the allow-list rather than approximating it: the config permits
 * `*.supabase.co` **under `/storage/v1/object/public/`**, so both the origin and
 * that path prefix are checked. A URL this returns `true` for is a URL the
 * loader cannot reject.
 *
 * Production Proofs are written only by `POST /api/payments/upload`, which
 * stores what `getPublicUrl` returns, so every real Proof takes the optimised
 * path and the queue's load weight is unchanged. This is a guard for anomalies,
 * not a second rendering mode anybody is meant to reach.
 */

/** The prefix `next.config.ts` allows on the storage host, exactly as written. */
export const PUBLIC_STORAGE_PREFIX = '/storage/v1/object/public/';

/** `new URL` throws on anything it cannot parse; an unparseable URL is a no. */
function parseUrl(value: string): URL | null {
    try {
        return new URL(value);
    } catch {
        return null;
    }
}

/**
 * The origin of the configured Supabase base URL. Taken through `URL` rather
 * than compared as a string so a trailing slash, a path, or a stray query on
 * the configured value cannot turn a legitimate Proof into a miss.
 */
function originOf(value: string | undefined): string | null {
    if (!value) {
        return null;
    }
    return parseUrl(value)?.origin ?? null;
}

/**
 * Whether this Proof URL is one the optimiser is configured to accept.
 *
 * Origin equality, never a suffix test: `https://evil-project.supabase.co` ends
 * with the storage host and is not it, and origin carries the scheme, so plain
 * `http` to the same host is a miss too.
 *
 * `storageBaseUrl` is passed in rather than read here so the rule stays pure
 * and testable; the caller supplies `NEXT_PUBLIC_SUPABASE_URL`. Missing config
 * answers `false` — unverifiable is not permission.
 */
export function isOptimisableProofUrl(
    url: string,
    storageBaseUrl: string | undefined,
): boolean {
    const storageOrigin = originOf(storageBaseUrl);
    if (storageOrigin === null) {
        return false;
    }
    const proof = parseUrl(url);
    if (proof === null) {
        return false;
    }
    return (
        proof.origin === storageOrigin &&
        proof.pathname.startsWith(PUBLIC_STORAGE_PREFIX)
    );
}

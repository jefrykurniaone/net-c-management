import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
    getPublicCommunityName,
    getPublicCopy,
    getPublicIdentity,
    getPublicLandingData,
} from '@/lib/public-landing';
import { buildBoardRows } from '@/lib/landing-board';
import { IdentityRail } from '@/components/landing/identity-rail';
import { HeroBand } from '@/components/landing/hero-band';
import { BoardBand } from '@/components/landing/board-band';
import { LandingFooter } from '@/components/landing/landing-footer';

// The public page. Strangers arrive here — from a search result, from a
// WhatsApp link — with no account and no idea what this community is, so the
// route's job is to sell one club to people who might join it. Not software to
// clubs: there is one community per deployment.
//
// Two bands and a footer. The painted hero carries the pitch and the one loud
// action; the enamel band below carries the community's real Activities. The
// pitch used to be generic by decision; #153 reopened that, so an Admin who
// writes a headline and a subline in Settings replaces it, and one who writes
// nothing still gets a page that reads. The page is short on purpose — a page
// that scrolls with nothing to say is worse than one that stops.
//
// Everything it reads comes through `src/lib/public-landing.ts`, the sole
// module this route may query. A lint rule, not a convention, keeps Prisma and
// the holds sweep out of this file: bank details and `adminWhatsapp` sit on the
// same `Activity` row as the name and the fees, and the sweep both mutates and
// sends mail, which no unauthenticated GET may do.

/**
 * What a stranger reads before they arrive (ticket 12).
 *
 * The `<title>` is the **community name alone** — no suffix. The name is
 * unbounded runtime configuration, so any suffix is the part a search result
 * truncates first, and every suffix still legal here (no brand, nothing
 * sport-specific, no tagline) is generic filler that costs pixels and says
 * nothing. That puts the whole "what is this" load on the description, which is
 * its own dictionary string rather than the hero's lead reused: the pitch is
 * capped at 48 characters on `id`, and a snippet wants ~155 and is read with no
 * wordmark above it.
 *
 * `/` is the one indexable route in this deployment (decision 7). Everything
 * else is `noindex`, enforced both here-adjacent — in `src/app/robots.ts` — and
 * on the routes themselves, because robots.txt is advisory.
 *
 * The image is not declared: `src/app/opengraph-image.tsx` sits at the root
 * segment, so every route inherits it and this one needs no `images` entry.
 */
export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const communityName = await getPublicCommunityName(locale);
    const { description } = getDictionary(locale).landing.meta;

    return {
        title: communityName,
        description,
        openGraph: { title: communityName, description, type: 'website' },
        twitter: { card: 'summary_large_image', title: communityName, description },
        robots: { index: true, follow: true },
    };
}

export default async function LandingPage() {
    // The locale cookie is read first because the community-name fallback is
    // locale-resolved and that resolution may not happen inside a cache scope.
    // On a cache hit this render touches Prisma zero times.
    const locale = await getLocale();
    const [session, identity, landing, copy] = await Promise.all([
        auth(),
        getPublicIdentity(locale),
        getPublicLandingData(),
        getPublicCopy(locale),
    ]);
    const t = getDictionary(locale);

    // Nobody signed in is being sold to. This redirect lives in the page body
    // rather than in middleware, which never touches `/`.
    if (session?.user) {
        if (!session.user.isProfileComplete) {
            redirect('/onboarding');
        }
        redirect('/dashboard');
    }

    const rows = buildBoardRows(landing, t);

    return (
        <div className='flex min-h-dvh flex-col bg-background'>
            <IdentityRail
                communityName={identity.communityName}
                logoUrl={identity.logoUrl}
            />
            {/* The hero's two lines are the Admin's own words when Settings
                carries them and the dictionary's when it does not (#153). The
                about paragraph and the feature cards `copy` also resolves have
                no band to render into yet — #154 builds those — so this page
                deliberately reads two of the four fields and no more. */}
            <HeroBand
                t={t}
                communityName={identity.communityName}
                headline={copy.heroHeadline}
                subline={copy.heroSubline}
            />
            <main className='flex-1'>
                <BoardBand t={t} rows={rows} />
            </main>
            <LandingFooter
                communityName={identity.communityName}
                t={t}
                year={new Date().getFullYear()}
            />
        </div>
    );
}

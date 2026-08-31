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
import { AboutBand } from '@/components/landing/about-band';
import { ActivitiesBand } from '@/components/landing/activities-band';
import { FeaturesBand } from '@/components/landing/features-band';
import { LandingFooter } from '@/components/landing/landing-footer';

// The public page. Strangers arrive here — from a search result, from a
// WhatsApp link — with no account and no idea what this community is, so the
// route's job is to sell one club to people who might join it. Not software to
// clubs: there is one community per deployment.
//
// A rail, a band stack and a footer. The hero carries the pitch and the one
// loud action on a dark ground the visitor's theme does not change; the bands
// below it carry the Admin's paragraph, the community's real Activities, and
// their four short claims. Every string on the page is generic by default and
// the Admin's when they have written one (#153) — the page is a poster nobody
// can edit only for as long as nobody edits it.
//
// Two of the four bands render conditionally, and the page stays short when
// they do not: a page that scrolls with nothing to say is worse than one that
// stops.
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
                t={t}
            />
            {/* The band stack, in the order the spec fixes: hero, about,
                Activities, features. Two of the four are conditional, and the
                condition is the resolved copy rather than the raw Settings
                row — `getPublicCopy` resolves an unwritten about paragraph to
                `null` and drops every untitled feature card, so a half-filled
                form cannot produce a band of nothing and no band component is
                ever asked to render its own absence.
                Every band is inside `main`: the hero is this page's primary
                content, not a decoration above it. */}
            <main className='flex-1'>
                <HeroBand
                    t={t}
                    headline={copy.heroHeadline}
                    subline={copy.heroSubline}
                    heroImageUrl={identity.heroImageUrl}
                />
                {copy.about === null ? null : (
                    <AboutBand t={t} about={copy.about} />
                )}
                <ActivitiesBand t={t} rows={rows} />
                {copy.features.length > 0 ? (
                    <FeaturesBand t={t} features={copy.features} />
                ) : null}
            </main>
            <LandingFooter
                communityName={identity.communityName}
                t={t}
                year={new Date().getFullYear()}
            />
        </div>
    );
}

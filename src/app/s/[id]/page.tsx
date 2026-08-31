import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Clock, MapPin, CalendarDays } from 'lucide-react';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries';
import {
    getPublicIdentity,
    getPublicSessionCard,
    type PublicSessionCard,
} from '@/lib/public-landing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ThresholdRail } from '@/components/layout/threshold-rail';

// The shared-session page — the link a member actually pastes into WhatsApp, and
// an **unauthenticated** route: `src/proxy.ts` builds `isProtectedRoute` from
// `/dashboard`, `/sessions`, `/payments`, `/profile` and `/admin`, and `/s` is in
// none of them. Ticket 12 found that out and promoted ticket 04's public-data
// rules to bind every unauthenticated route, card and body alike, so this page is
// judged by the same allow-list as `/`. Four things it used to publish are gone:
//
//  - **Capacity** — `spotsLeft`, `registered / max`, and the progress bar. Not
//    merely barred: the figure was *wrong*. It counted `REGISTERED` rows without
//    running the holds sweep, so a lapsed unfunded hold still counted as a taken
//    seat. It cannot be fixed here either, because the sweep deletes rows and
//    queues member email, which no public GET may do. An unfixable number on a
//    public route is not a number to keep.
//  - **`ActivitySession.title` and `notes`** — unvalidated admin free text
//    written under an internal-tool assumption. The Activity's name is the
//    heading now.
//  - **Per-session `location`**, which can be a one-off private address. The
//    Activity's standing `defaultLocation` publishes in its place.
//  - **`getSettings()`** for the header identity: it is an uncached `findMany`
//    that also returns `adminWhatsapp`, which is on the no-list. Identity comes
//    through the public choke point like everything else here.

/** Both the heading and the metadata title: the Activity's name. */
function cardTitle(session: PublicSessionCard): string {
    return session.activity.name;
}

function formatDate(date: Date, locale: Locale, pattern: string): string {
    return format(date, pattern, {
        locale: locale === 'id' ? localeId : enUS,
    });
}

/** `08:00 – 10:00`, or just the start when no end time is stored. */
function formatTimeRange(session: PublicSessionCard): string {
    return session.endTime
        ? `${session.startTime} – ${session.endTime}`
        : session.startTime;
}

/**
 * Text metadata stays this route's own — it takes the root segment's OG image
 * rather than painting a card of its own, which is what decision 6 buys it: a
 * community wordmark instead of the bare preview it used to show.
 *
 * The images are pulled off `parent` deliberately. A colocated
 * `opengraph-image` file reaches a *child* segment only while that child leaves
 * `openGraph` alone; declaring a title and description here replaces the
 * inherited object wholesale and drops the image with it — measured, not
 * assumed. Extending the parent's list is the documented way to override the
 * text and keep the picture.
 *
 * `noindex` regardless of the trimming above (decision 7): a session's time and
 * place should not be searchable even once the allow-list has cut the card back
 * to what is publishable. The link is meant to be sent to someone.
 */
export async function generateMetadata(
    { params }: Readonly<{ params: Promise<{ id: string }> }>,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const { id } = await params;
    const [locale, session, inherited] = await Promise.all([
        getLocale(),
        getPublicSessionCard(id),
        parent,
    ]);

    // No title of its own for a session that does not exist — it falls back to
    // the root layout's neutral default rather than inventing a hardcoded
    // English string outside the dictionary.
    if (!session) return { robots: { index: false, follow: false } };

    const title = cardTitle(session);
    const parts = [
        formatDate(session.date, locale, 'EEE, d MMM yyyy'),
        formatTimeRange(session),
        session.activity.defaultLocation,
    ].filter(Boolean);
    const description = parts.join(' · ');
    const images = inherited.openGraph?.images ?? [];

    return {
        title,
        description,
        openGraph: { title, description, type: 'website', images },
        // `summary`, which this page declared before, crops the inherited
        // 1200x630 card to a small square (decision 10).
        twitter: { card: 'summary_large_image', title, description, images },
        robots: { index: false, follow: false },
    };
}

const FACT_ROW_CLASS = 'flex items-center gap-cell';
const FACT_ICON_CLASS = 'w-[18px] h-[18px] shrink-0 text-primary';

export default async function PublicSessionPage({
    params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
    const { id } = await params;
    const locale = await getLocale();
    const [identity, session] = await Promise.all([
        getPublicIdentity(locale),
        getPublicSessionCard(id),
    ]);
    const t = getDictionary(locale);

    if (!session) notFound();

    const callbackUrl = encodeURIComponent(`/sessions/${id}`);
    const { defaultLocation } = session.activity;

    return (
        <div className='flex min-h-screen flex-col bg-background'>
            <ThresholdRail
                communityName={identity.communityName}
                logoUrl={identity.logoUrl}
            />
            <main className='flex flex-1 items-start justify-center px-block py-band'>
                <Card className='w-full max-w-[28rem]'>
                    <CardContent className='flex flex-col gap-block'>
                        <h1 className='type-display text-balance text-foreground'>
                            {cardTitle(session)}
                        </h1>

                        <div className='flex flex-col gap-cell type-body text-secondary-foreground'>
                            <div className={FACT_ROW_CLASS}>
                                <CalendarDays
                                    className={FACT_ICON_CLASS}
                                    aria-hidden='true'
                                />
                                <span>
                                    {formatDate(
                                        session.date,
                                        locale,
                                        'EEEE, d MMMM yyyy',
                                    )}
                                </span>
                            </div>
                            <div className={FACT_ROW_CLASS}>
                                <Clock
                                    className={FACT_ICON_CLASS}
                                    aria-hidden='true'
                                />
                                <span>{formatTimeRange(session)}</span>
                            </div>
                            {/* The standing location is optional configuration,
                                so the row goes rather than rendering an empty
                                line beside a pin. */}
                            {defaultLocation && (
                                <div className={FACT_ROW_CLASS}>
                                    <MapPin
                                        className={FACT_ICON_CLASS}
                                        aria-hidden='true'
                                    />
                                    <span>{defaultLocation}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button className='w-full' size='lg' asChild>
                            <Link href={`/auth/signin?callbackUrl=${callbackUrl}`}>
                                {t.sessions.publicPageRsvpCta}
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}

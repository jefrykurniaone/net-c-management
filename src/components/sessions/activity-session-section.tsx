import Link from 'next/link';
import { ActivityTile } from '@/components/activity/activity-tile';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { SessionGridCard, type SessionGridCardData } from './session-grid-card';

/**
 * One Activity's section on the sessions page: its livery, its name, how many
 * upcoming Sessions it has, and those Sessions as a grid of cards.
 *
 * The section header is why the cards below it draw neither the Activity's name
 * nor its tile (`docs/adr/0018-session-cards-outside-a-week.md`). An Activity
 * with nothing upcoming keeps its section and says so in one sentence, so a
 * member can tell it exists and has no dates yet rather than that they were
 * removed from it. It takes data and never nodes.
 */

/**
 * The card-per-entity grid this repository already lays out, taken verbatim from
 * the admin dashboard's Activity cards so there is one grid idiom rather than
 * two: one card across on a phone, two on a tablet, three on a desktop.
 */
const SECTION_GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';

/** The way past the cap, at the same 44px touch target as every other pill. */
const SEE_ALL_CLASS = [
    'inline-flex min-h-11 w-fit self-start items-center rounded-full border',
    'border-border bg-card px-block type-label text-secondary-foreground',
    'shadow-lift transition-rally hover:bg-muted hover:text-foreground',
    'focus-visible:outline-2 focus-visible:outline-ring',
    'focus-visible:outline-offset-2',
].join(' ');

export type ActivitySectionCard = Readonly<{
    key: string;
    card: SessionGridCardData;
}>;

export type ActivitySectionView = Readonly<{
    /** The Activity's id: the section's React key and its heading's id. */
    key: string;
    activityName: string;
    /** `Activity.icon` as stored, or null for the initial tile. */
    activityIcon: string | null;
    /** The Activity's true count of upcoming Sessions, never the drawn one. */
    total: number;
    cards: readonly ActivitySectionCard[];
    /** `null` unless the cap dropped cards this section would otherwise draw. */
    seeAllHref: string | null;
}>;

/**
 * The tile is decorative here and deliberately unlabelled: the heading beside it
 * already names the Activity, and a labelled tile would say it twice.
 */
function SectionHeader({
    section,
    headingId,
    t,
}: Readonly<{
    section: ActivitySectionView;
    headingId: string;
    t: Dictionary;
}>) {
    return (
        <div className='flex flex-wrap items-center gap-cell'>
            <ActivityTile
                name={section.activityName}
                icon={section.activityIcon}
                size='lead'
                labelled={false}
            />
            <h2 id={headingId} className='type-title text-foreground'>
                {section.activityName}
            </h2>
            <span className='type-caption text-secondary-foreground'>
                {t.sessions.activityUpcomingCount.replace(
                    '{n}',
                    String(section.total),
                )}
            </span>
        </div>
    );
}

export function ActivitySessionSection({
    section,
    t,
}: Readonly<{ section: ActivitySectionView; t: Dictionary }>) {
    const headingId = `activity-section-${section.key}`;
    return (
        <section
            aria-labelledby={headingId}
            className='flex flex-col gap-cell'>
            <SectionHeader section={section} headingId={headingId} t={t} />
            {section.cards.length === 0 ? (
                <p className='type-caption text-muted-foreground'>
                    {t.sessions.activityNoUpcoming}
                </p>
            ) : (
                <div className={SECTION_GRID}>
                    {section.cards.map((entry) => (
                        <SessionGridCard key={entry.key} card={entry.card} t={t} />
                    ))}
                </div>
            )}
            {section.seeAllHref !== null && (
                <Link href={section.seeAllHref} className={SEE_ALL_CLASS}>
                    {t.sessions.activitySeeAll.replace(
                        '{n}',
                        String(section.total),
                    )}
                </Link>
            )}
        </section>
    );
}

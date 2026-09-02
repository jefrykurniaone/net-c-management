import type { Dictionary } from '@/lib/i18n/dictionaries';
import { BOARD_GUTTER_CLASS } from './band';

/**
 * The page's last band: the year and one line, gutter-aligned to the same 72rem
 * as the header rail and the board above it. The padding sits inside the
 * wrapper, matching the rail — outside it the line lands 16px left of
 * everything else and the shared left edge breaks.
 *
 * No action here. The quiet second one sits at the board band's foot, where a
 * reader who has just been convinced by real data is still looking.
 */
export function LandingFooter({
    communityName,
    t,
    year,
}: Readonly<{ communityName: string; t: Dictionary; year: number }>) {
    return (
        <footer className='border-t border-border bg-background'>
            <p
                className={`mx-auto ${BOARD_GUTTER_CLASS} type-caption px-block py-cell text-muted-foreground`}>
                © <span className='tabular-nums'>{year}</span> {communityName}.{' '}
                {t.landing.footer}
            </p>
        </footer>
    );
}

import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { TASK_MEASURE } from '@/components/layout/measure';
import { cn } from '@/lib/utils';

/**
 * The identity-only header rail shared by the threshold pages (#156):
 * sign-in, onboarding, the Applicant waiting room and the shared Session
 * card. Mark and community name, nothing else — no navigation, no theme
 * toggle, no language switcher, because a stranger or an Applicant on one of
 * these pages has nowhere else on the page to go but through its one action.
 *
 * Distinct from `@/components/landing/identity-rail`, the public landing
 * page's own rail: that one carries `ThemeToggle` and `LanguageSwitcher` and
 * sizes on `BOARD_GUTTER_CLASS` because it sits above the hero band. This
 * component is a sibling, not a replacement, and does not import from
 * `@/components/landing/`.
 */
export function ThresholdRail({
    communityName,
    logoUrl,
}: Readonly<{ communityName: string; logoUrl: string }>) {
    return (
        <header className='border-b border-border bg-background'>
            <div
                className={cn(
                    TASK_MEASURE,
                    'flex items-center gap-cell px-block py-cell',
                )}>
                <CommunityIdentityMark
                    communityName={communityName}
                    logoUrl={logoUrl}
                    size='md'
                />
                {/* No `break-words`: the name wraps at its spaces and is never
                    broken mid-word (#209). This rail is the easy half of that
                    fix — it carries no trailing controls, so its wordmark
                    already has the whole 312px line the landing rail only
                    reaches by dropping its control row to a second row, and
                    every name the settings cap admits (48 characters, 18 letters
                    per word — 291.94px at the widest glyph in the family) fits
                    it without the row having to yield anything.

                    `min-w-0` stays, for the opposite reason it had to go from
                    the landing rail: there is no control row here to give the
                    name a line it does not already have, so a min-content floor
                    would buy it no room and would instead push this centred
                    measure wider than the viewport, trading a bounded wordmark
                    for a horizontally scrolling page.

                    The name wears Title (#223), as it does in the landing rail,
                    and carries no size, weight, tracking or transform of its
                    own. */}
                <span className='type-title min-w-0 text-foreground'>
                    {communityName}
                </span>
            </div>
        </header>
    );
}

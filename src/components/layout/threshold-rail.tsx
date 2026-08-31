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
                {/* Same never-bleed guarantee every threshold rail carries: the
                    community name is runtime configuration of unknown length. */}
                <span className='type-mark min-w-0 break-words text-foreground'>
                    {communityName}
                </span>
            </div>
        </header>
    );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { resolveAdmissionState, type AdmissionState } from '@/lib/admission';
import type { ChipVariant } from '@/lib/status-chip';
import { Chip } from '@/components/ui/chip';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { SignOutAction } from './sign-out-action';

/**
 * The Applicant's waiting room.
 *
 * An **interstitial**, not a receipt: vertical-centred, owning the whole
 * viewport under the identity rail — the one placement DESIGN.md reserves for
 * interstitials. One chip, one statement, one lead line, two affordances.
 *
 * It echoes **nothing** back — not the profile, not the Activities picked — and
 * queries **no community data**. The gate is disclosed before the click and
 * admission is emailed, so a third, weaker copy of the same reassurance is not
 * worth the tease. That is a standing rule, not an accident of this revision:
 * this route may read `Settings` and the signed-in person's own admission state,
 * and nothing else. Adding a session list here reopens a boundary question
 * ticket 04 deliberately closed — an Applicant is authenticated but not
 * admitted, and no ruling exists on what that third audience may see.
 */
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

/** The 40rem single-task column. */
const COLUMN_CLASS = 'max-w-[40rem]';

/**
 * What the reader is told, chosen by the state the two columns resolve to.
 *
 * The variant is narrowed to the only two this route can mean. A waiting room
 * has no settled state and no neutral one — an Applicant is being held or has
 * been turned away — and the narrow type is what stops a later edit quietly
 * announcing a rejection in the settled green.
 */
type Statement = Readonly<{
    variant: Extract<ChipVariant, 'provisional' | 'void'>;
    chipLabel: string;
    title: string;
    lead: string;
}>;

function statementFor(state: AdmissionState, t: Dictionary): Statement {
    // Provisional is *held*, void is *no*. Under The Label Rule the chip says
    // which in words, so "not yet" and "no" never rest on the colour alone.
    if (state === 'declined') {
        return {
            variant: 'void',
            chipLabel: t.pending.declinedMark,
            title: t.pending.declinedTitle,
            lead: t.pending.declinedLead,
        };
    }
    if (state === 'revoked') {
        return {
            variant: 'void',
            chipLabel: t.pending.revokedMark,
            title: t.pending.revokedTitle,
            lead: t.pending.revokedLead,
        };
    }
    return {
        variant: 'provisional',
        chipLabel: t.pending.waitingMark,
        title: t.pending.waitingTitle,
        lead: t.pending.waitingLead,
    };
}

/**
 * The rail is identity only: no navigation, because there is nowhere for an
 * Applicant to go, and no controls, because the page has exactly two.
 */
function IdentityRail({
    communityName,
    logoUrl,
}: Readonly<{ communityName: string; logoUrl: string }>) {
    return (
        <header className='border-b border-rule bg-background'>
            <div
                className={`mx-auto flex w-full ${COLUMN_CLASS} items-center gap-cell px-block py-cell`}>
                <CommunityIdentityMark
                    communityName={communityName}
                    logoUrl={logoUrl}
                    size='md'
                />
                {/* Same never-bleed guarantee the other rails carry: the
                    community name is runtime configuration of unknown length. */}
                <span className='type-mark min-w-0 break-words text-foreground'>
                    {communityName}
                </span>
            </div>
        </header>
    );
}

/**
 * WhatsApp is the incumbent channel and, for a declined Applicant, the *only*
 * recourse — there is no appeal button and no re-apply flow, because the
 * organizer decided and the organizer can change their mind. Absent a configured
 * number the page keeps its one remaining affordance rather than rendering a
 * dead control.
 */
function WhatsappAction({
    phone,
    label,
}: Readonly<{ phone: string; label: string }>) {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    return (
        <a
            href={`https://wa.me/${digits}`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex min-h-11 items-center justify-center rounded-[2px] bg-primary-solid px-bay type-label text-primary-solid-foreground hover:bg-primary-solid/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'>
            {label}
        </a>
    );
}

/**
 * One chip, one statement, one lead line, two actions — vertical-centred so it
 * owns the viewport under the rail.
 */
function Interstitial({
    statement,
    adminWhatsapp,
    t,
}: Readonly<{
    statement: Statement;
    adminWhatsapp: string;
    t: Dictionary;
}>) {
    return (
        <main className='flex flex-1 items-center justify-center px-block py-bay'>
            <div
                className={`flex w-full ${COLUMN_CLASS} flex-col items-center gap-block text-center`}>
                <Chip variant={statement.variant} label={statement.chipLabel} />
                <h1 className='type-display min-w-0 max-w-full text-balance text-foreground'>
                    {statement.title}
                </h1>
                <p className='type-body max-w-[52ch] text-secondary-foreground'>
                    {statement.lead}
                </p>
                <div className='mt-cell flex flex-wrap items-center justify-center gap-cell'>
                    <WhatsappAction
                        phone={adminWhatsapp}
                        label={t.pending.whatsapp}
                    />
                    <SignOutAction label={t.pending.signOut} />
                </div>
            </div>
        </main>
    );
}

export default async function PendingPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    // The session carries admission as one boolean; which *kind* of "not in"
    // this is takes both columns, and the copy turns on the difference.
    const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { admittedAt: true, isActive: true, isProfileComplete: true },
    });
    if (!me) {
        redirect('/auth/signin');
    }

    // Profile first, admission second: an Applicant who has not finished the
    // form is not yet a decision the Admin can make.
    if (!me.isProfileComplete) {
        redirect('/onboarding');
    }

    const state = resolveAdmissionState(me);
    if (state === 'admitted') {
        redirect('/dashboard');
    }

    const [settings, locale] = await Promise.all([getSettings(), getLocale()]);
    const t = getDictionary(locale);

    return (
        <div className='flex min-h-screen flex-col bg-background'>
            <IdentityRail
                communityName={settings.communityName}
                logoUrl={settings.logoUrl}
            />
            <Interstitial
                statement={statementFor(state, t)}
                adminWhatsapp={settings.adminWhatsapp}
                t={t}
            />
        </div>
    );
}

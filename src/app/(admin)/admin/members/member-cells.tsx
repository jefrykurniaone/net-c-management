import Link from 'next/link';
import { PaymentMode, PaymentStatus, Role } from '@prisma/client';
import { ActivityTile } from '@/components/activity/activity-badge';
import { Chip, StatusChip } from '@/components/ui/chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { DuesStanding } from '@/lib/member-standing';
import { paymentState } from '@/lib/status-chip';
import { cn } from '@/lib/utils';
import { MemberActions } from './member-actions';
import type { MembershipCell, MemberRow } from './member-rows';

/**
 * The values one Member row holds. The register owns where each of these lands
 * and how it rules; these components own only what a single value looks like.
 */

/** Nothing to draw — a member with no number, an Activity nobody picked. */
const EM_DASH = '—';

/**
 * The two views the detail page shares with the register. Narrower than a whole
 * row on purpose: the same cell draws a roster row and a profile header, and
 * neither surface has to hand the other a shape it does not have.
 */
export type ContactView = Readonly<{
    email: string | null;
    phone: string | null;
    isContactWithheld: boolean;
}>;

export type RoleView = Readonly<{ role: Role; isActive: boolean }>;

/**
 * A Role is a standing property of a person, not a state of a thing, so it is
 * lettered as a tracked-caps label and never as a status chip.
 *
 * **Admin and Owner are drawn identically and differ only in the word.** The
 * Owner carries no capability an Admin lacks — it is an immutability and
 * privacy marker, not a rank — so a louder Owner label would state a hierarchy
 * the code does not have (docs/owner-role-immutability.md, rule 4). Member is
 * quieter than both because it is the ordinary case, and the word itself is
 * what identifies the role either way: nothing here is carried by colour.
 */
const ROLE_TONE: Record<Role, string> = {
    [Role.OWNER]: 'text-foreground',
    [Role.ADMIN]: 'text-foreground',
    [Role.MEMBER]: 'text-muted-foreground',
};

/** How a member's Activity is billed, in the member's own words. */
export function modeLabel(mode: PaymentMode | null, t: Dictionary): string {
    if (mode === PaymentMode.MONTHLY) {
        return t.paymentMode.monthly;
    }
    if (mode === PaymentMode.PER_SESSION) {
        return t.paymentMode.perSession;
    }
    return t.admin.modeNotChosen;
}

/**
 * Standing on one Membership: the Dues state for the current Billing Period.
 *
 * Where a Payment stands against the period, the chip comes from the one
 * resolver every surface reads, so this row and the member's own profile can
 * never disagree about what Confirmed looks like. Where none does, there is no
 * stored state to resolve and the neutral chip is drawn directly — the same
 * reasoning as `profile.markNotPaid`. A per-Session Membership draws nothing.
 */
export function StandingChip({
    standing,
    t,
}: Readonly<{ standing: DuesStanding; t: Dictionary }>) {
    if (standing === 'none') {
        return null;
    }
    if (standing === 'owed') {
        return <Chip variant='neutral' label={t.admin.standingOwed} />;
    }
    const status =
        standing === 'settled' ? PaymentStatus.CONFIRMED : PaymentStatus.PENDING;
    return <StatusChip state={paymentState(status)} labels={t.chips} />;
}

/**
 * Who they are, and the way through to their detail page.
 *
 * The missing-name placeholder and the incomplete-profile label are two
 * independent facts, not one fallback wearing two hats: a member can lack a
 * name and hold a complete profile, or carry a name and still be stuck at
 * onboarding. `isProfileComplete` is a state of the account's setup, so it is
 * lettered as a tracked-caps label — the same treatment the role already
 * uses below — never a status chip, which is reserved for a standing.
 */
export function MemberIdentity({
    member,
    t,
}: Readonly<{ member: MemberRow; t: Dictionary }>) {
    return (
        <span className='flex min-w-0 flex-col gap-hair'>
            <Link
                href={`/admin/members/${member.id}`}
                className='type-title text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                {member.name ?? t.admin.memberNameEmpty}
            </Link>
            {!member.isProfileComplete && (
                <span className='type-label text-muted-foreground'>
                    {t.admin.profileIncomplete}
                </span>
            )}
        </span>
    );
}

/**
 * A phone number *is* the identity check in a WhatsApp-run community, so it
 * sits in the row rather than a screen away.
 */
function WhatsappLink({
    phone,
    label,
}: Readonly<{ phone: string; label: string }>) {
    const digits = phone.replace(/\D/g, '');
    if (!digits) {
        return null;
    }
    return (
        <a
            href={`https://wa.me/${digits}`}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`${label} ${phone}`}
            className='type-caption w-fit tabular-nums text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
            {phone}
        </a>
    );
}

/**
 * How to reach them — or, on an Owner row an Admin is reading, the word that
 * says why they cannot. Withheld rather than blank: a blank cell reads as an
 * unfilled profile and sends the Admin looking for the number somewhere else.
 */
export function MemberContact({
    member,
    t,
}: Readonly<{ member: ContactView; t: Dictionary }>) {
    if (member.isContactWithheld) {
        return (
            <span className='type-caption text-muted-foreground'>
                {t.admin.contactWithheld}
            </span>
        );
    }
    return (
        <span className='flex min-w-0 flex-col gap-hair'>
            <span className='type-caption break-all text-muted-foreground'>
                {member.email ?? EM_DASH}
            </span>
            {member.phone && (
                <WhatsappLink phone={member.phone} label={t.admin.colPhone} />
            )}
        </span>
    );
}

/** The role, plus whether the account is still standing. */
export function MemberRole({
    member,
    t,
}: Readonly<{ member: RoleView; t: Dictionary }>) {
    return (
        <span className='flex flex-wrap items-center gap-cell'>
            <span className={cn('type-label', ROLE_TONE[member.role])}>
                {t.roles[member.role]}
            </span>
            {!member.isActive && (
                <Chip variant='neutral' label={t.admin.inactive2} />
            )}
        </span>
    );
}

/**
 * What can be done to this account. On an Owner row the answer is nothing, and
 * the controls are **absent** rather than disabled — a disabled button offers a
 * job the system will refuse, which is exactly the wasted attempt this surface
 * exists to prevent. A sentence stands in their place so the row says why.
 *
 * That sentence is Caption rather than Body: DESIGN.md sets the Body floor for a
 * disclosure a *control's* label defers to, and here there is no control left to
 * qualify — the sentence is the whole of the cell.
 */
export function MemberRowActions({
    member,
    currentUserId,
    t,
}: Readonly<{ member: MemberRow; currentUserId: string; t: Dictionary }>) {
    if (member.isImmutable) {
        return (
            <span className='type-caption text-muted-foreground'>
                {t.admin.ownerImmutable}
            </span>
        );
    }
    return <MemberActions member={member} currentUserId={currentUserId} />;
}

/** One Membership: the Activity's tile and name, how it bills, how it stands. */
function MembershipLine({
    membership,
    t,
}: Readonly<{ membership: MembershipCell; t: Dictionary }>) {
    return (
        <span className='flex flex-wrap items-center gap-cell'>
            <span className='flex items-center gap-hair'>
                <ActivityTile name={membership.activityName} />
                <span className='type-body text-foreground'>
                    {membership.activityName}
                </span>
            </span>
            <span className='type-caption text-muted-foreground'>
                {modeLabel(membership.mode, t)}
            </span>
            <StandingChip standing={membership.standing} t={t} />
        </span>
    );
}

/**
 * Every Activity this member belongs to, each carrying the two facts an Admin
 * is asked about: how it bills them, and whether this Billing Period is settled.
 */
export function MemberMemberships({
    member,
    t,
}: Readonly<{ member: MemberRow; t: Dictionary }>) {
    if (member.memberships.length === 0) {
        return (
            <span className='type-caption text-muted-foreground'>
                {t.admin.membersNoMemberships}
            </span>
        );
    }
    return (
        <span className='flex flex-col gap-cell'>
            {member.memberships.map((membership) => (
                <MembershipLine
                    key={membership.activityId}
                    membership={membership}
                    t={t}
                />
            ))}
        </span>
    );
}

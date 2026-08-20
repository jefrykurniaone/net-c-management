'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import type { MembershipRowView } from '@/lib/membership-mode-view';
import { AccountSettings } from './account-settings';
import { EditProfileDialog } from './edit-profile-dialog';
import { LeaveActivityDialog } from './leave-activity-dialog';
import { Lattice, SectionHead } from './BoardCells';
import { MembershipCell } from './MembershipCell';

interface ProfileUser {
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
}

/** The Activity a leave dialog is open for, or `null` when it is closed. */
type LeavingActivity = { id: string; name: string } | null;

interface ProfilePanelProps {
    user: ProfileUser;
    memberSinceDate: string;
    memberships: readonly MembershipRowView[];
}

/**
 * The member's profile and their per-Activity Memberships, on one surface.
 *
 * They belong together because payment mode is a property of a Membership and
 * not of the person: a member changing Badminton to per-Session would otherwise
 * reasonably assume they had changed Futsal too. Each Membership is its own cell
 * with its own control, and the section says so in a line of its own.
 *
 * Structure is a ruled lattice — cells sharing their rules with their
 * neighbours — never gaps between floating panels.
 */
export function ProfilePanel({
    user,
    memberSinceDate,
    memberships,
}: Readonly<ProfilePanelProps>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [profile, setProfile] = useState(user);
    const [editOpen, setEditOpen] = useState(false);
    const [leaving, setLeaving] = useState<LeavingActivity>(null);

    return (
        <div className='flex flex-col gap-bay'>
            <ProfileBays
                profile={profile}
                memberSinceDate={memberSinceDate}
                memberships={memberships}
                t={t}
                onEdit={() => setEditOpen(true)}
                onLeave={setLeaving}
            />
            <ProfileDialogs
                profile={profile}
                setProfile={setProfile}
                editOpen={editOpen}
                setEditOpen={setEditOpen}
                leaving={leaving}
                setLeaving={setLeaving}
            />
        </div>
    );
}

interface ProfileBaysProps {
    profile: ProfileUser;
    memberSinceDate: string;
    memberships: readonly MembershipRowView[];
    t: Dictionary;
    onEdit: () => void;
    onLeave: (activity: LeavingActivity) => void;
}

/** The surface itself, in reading order: who you are, what you pay for, settings. */
function ProfileBays({
    profile,
    memberSinceDate,
    memberships,
    t,
    onEdit,
    onLeave,
}: Readonly<ProfileBaysProps>) {
    return (
        <>
            <Lattice>
                <IdentityCell
                    profile={profile}
                    memberSinceDate={memberSinceDate}
                    t={t}
                    onEdit={onEdit}
                />
            </Lattice>
            <MembershipsSection
                memberships={memberships}
                t={t}
                onLeave={onLeave}
            />
            <AccountSettings phone={profile.phone} onEditPhone={onEdit} />
            <SignOutAction label={t.nav.signOut} />
        </>
    );
}

interface IdentityCellProps {
    profile: ProfileUser;
    memberSinceDate: string;
    t: Dictionary;
    onEdit: () => void;
}

/**
 * Who the member is. The avatar is the one genuinely round object on this
 * surface — a photo pinned to the board — and its lettered fallback stays
 * neutral rather than tinting a cell with the identity green.
 */
function IdentityCell({
    profile,
    memberSinceDate,
    t,
    onEdit,
}: Readonly<IdentityCellProps>) {
    const initial = (profile.name ?? profile.email ?? '?')[0].toUpperCase();

    return (
        <div className='flex items-center gap-cell p-block'>
            <Avatar className='size-12'>
                <AvatarImage
                    src={profile.image ?? ''}
                    alt={profile.name ?? ''}
                />
                <AvatarFallback className='type-title bg-board text-secondary-foreground'>
                    {initial}
                </AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
                <p className='type-title truncate text-card-foreground'>
                    {profile.name ?? t.profile.roleMember}
                </p>
                <p className='type-caption truncate text-secondary-foreground'>
                    {profile.email}
                </p>
                <p className='type-caption text-subtle-foreground'>
                    {t.profile.memberSince} {memberSinceDate}
                </p>
            </div>
            <Button variant='outline' size='sm' onClick={onEdit}>
                {t.profile.editButton}
            </Button>
        </div>
    );
}

interface MembershipsSectionProps {
    memberships: readonly MembershipRowView[];
    t: Dictionary;
    onLeave: (activity: LeavingActivity) => void;
}

/** Every Membership, one ruled cell each, sharing rules with its neighbours. */
function MembershipsSection({
    memberships,
    t,
    onLeave,
}: Readonly<MembershipsSectionProps>) {
    return (
        <section className='flex flex-col gap-block'>
            <SectionHead
                label={t.profile.membershipsLabel}
                hint={t.profile.membershipsHint}
            />
            <Lattice>
                {memberships.length === 0 ? (
                    <p className='type-body p-block text-secondary-foreground'>
                        {t.profile.noMemberships}
                    </p>
                ) : (
                    memberships.map((row) => (
                        <MembershipCell
                            key={row.activityId}
                            row={row}
                            t={t}
                            onLeave={() =>
                                onLeave({ id: row.activityId, name: row.name })
                            }
                        />
                    ))
                )}
            </Lattice>
        </section>
    );
}

/** Ends the auth session — not a Session, which is a thing you turn up to. */
function SignOutAction({ label }: Readonly<{ label: string }>) {
    return (
        <Button
            variant='destructive-outline'
            className='w-full'
            onClick={() => signOut({ callbackUrl: '/' })}>
            <LogOut />
            {label}
        </Button>
    );
}

interface ProfileDialogsProps {
    profile: ProfileUser;
    setProfile: Dispatch<SetStateAction<ProfileUser>>;
    editOpen: boolean;
    setEditOpen: Dispatch<SetStateAction<boolean>>;
    leaving: LeavingActivity;
    setLeaving: Dispatch<SetStateAction<LeavingActivity>>;
}

/**
 * The two dialogs this surface opens. Both refresh the Server Component on
 * success, which is what re-derives the Billing Period sentences from the
 * resolver rather than guessing at them on the client.
 */
function ProfileDialogs({
    profile,
    setProfile,
    editOpen,
    setEditOpen,
    leaving,
    setLeaving,
}: Readonly<ProfileDialogsProps>) {
    const router = useRouter();

    return (
        <>
            <EditProfileDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                initial={{
                    name: profile.name ?? '',
                    phone: profile.phone ?? '',
                    image: profile.image,
                }}
                onSaved={(updated) => {
                    setProfile((prev) => ({ ...prev, ...updated }));
                    router.refresh();
                }}
            />
            <LeaveActivityDialog
                activity={leaving}
                onOpenChange={(open) => !open && setLeaving(null)}
                onLeft={() => {
                    setLeaving(null);
                    router.refresh();
                }}
            />
        </>
    );
}

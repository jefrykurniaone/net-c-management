'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import type { MembershipRowView } from '@/lib/membership-mode-view';
import { AccountSettings } from './account-settings';
import { EditProfileDialog } from './edit-profile-dialog';
import { LeaveActivityDialog } from './leave-activity-dialog';
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
 * The member's profile and their per-Activity Memberships, on Rally cards.
 *
 * Three cards, in reading order: who the member is, what they pay for, and
 * the account's own settings. They stay separate cards rather than one long
 * surface because payment mode is a property of a Membership and not of the
 * person — a member changing Badminton to per-Session would otherwise
 * reasonably assume they had changed Futsal too. Each Membership keeps its
 * own row inside the memberships card, with its own control.
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
            <ProfileCards
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

interface ProfileCardsProps {
    profile: ProfileUser;
    memberSinceDate: string;
    memberships: readonly MembershipRowView[];
    t: Dictionary;
    onEdit: () => void;
    onLeave: (activity: LeavingActivity) => void;
}

/** The surface itself, in reading order: who you are, what you pay for, settings. */
function ProfileCards({
    profile,
    memberSinceDate,
    memberships,
    t,
    onEdit,
    onLeave,
}: Readonly<ProfileCardsProps>) {
    return (
        <>
            <IdentityCard
                profile={profile}
                memberSinceDate={memberSinceDate}
                t={t}
                onEdit={onEdit}
            />
            <MembershipsCard memberships={memberships} t={t} onLeave={onLeave} />
            <AccountSettings phone={profile.phone} onEditPhone={onEdit} />
        </>
    );
}

interface IdentityCardProps {
    profile: ProfileUser;
    memberSinceDate: string;
    t: Dictionary;
    onEdit: () => void;
}

/**
 * Who the member is. The avatar is the one genuinely round object on this
 * card — a photo, not a tile — and its lettered fallback stays a neutral
 * fill rather than tinting the card with the identity green.
 */
function IdentityCard({
    profile,
    memberSinceDate,
    t,
    onEdit,
}: Readonly<IdentityCardProps>) {
    const initial = (profile.name ?? profile.email ?? '?')[0].toUpperCase();

    return (
        <Card size='sm'>
            <CardContent className='flex items-center gap-cell'>
                <Avatar className='size-12'>
                    <AvatarImage
                        src={profile.image ?? ''}
                        alt={profile.name ?? ''}
                    />
                    <AvatarFallback className='type-title bg-muted text-muted-foreground'>
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
            </CardContent>
        </Card>
    );
}

interface MembershipsCardProps {
    memberships: readonly MembershipRowView[];
    t: Dictionary;
    onLeave: (activity: LeavingActivity) => void;
}

/** Every Membership, one row each, sharing the card's own dividers. */
function MembershipsCard({
    memberships,
    t,
    onLeave,
}: Readonly<MembershipsCardProps>) {
    return (
        <Card className='gap-0 py-0' size='sm'>
            <CardHeader className='border-b py-block'>
                <CardTitle>{t.profile.membershipsLabel}</CardTitle>
                <CardDescription className='max-w-[65ch]'>
                    {t.profile.membershipsHint}
                </CardDescription>
            </CardHeader>
            <CardContent className='divide-y divide-border p-0'>
                {memberships.length === 0 ? (
                    <div className='flex items-center gap-cell p-block'>
                        <Chip variant='neutral' label={t.common.empty} />
                        <p className='type-body text-secondary-foreground'>
                            {t.profile.noMemberships}
                        </p>
                    </div>
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
            </CardContent>
        </Card>
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

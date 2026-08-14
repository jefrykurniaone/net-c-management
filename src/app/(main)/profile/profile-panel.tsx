'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { AccountSettings } from './account-settings';
import { EditProfileDialog } from './edit-profile-dialog';
import { LeaveActivityDialog } from './leave-activity-dialog';

interface ProfileUser {
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
}

interface MembershipView {
    activityId: string;
    name: string;
    color: string;
    joinedDate: string;
}

export function ProfilePanel({
    user,
    memberSinceDate,
    memberships,
}: Readonly<{
    user: ProfileUser;
    memberSinceDate: string;
    memberships: MembershipView[];
}>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const router = useRouter();
    const [profile, setProfile] = useState(user);
    const [editOpen, setEditOpen] = useState(false);
    const [leaving, setLeaving] = useState<{ id: string; name: string } | null>(
        null,
    );

    const initial = (profile.name ?? profile.email ?? '?')[0].toUpperCase();

    return (
        <div className='space-y-6'>
            {/* Identity card */}
            <div className='flex items-center gap-3.5 rounded-xl border border-border bg-card p-4'>
                <Avatar className='size-12'>
                    <AvatarImage
                        src={profile.image ?? ''}
                        alt={profile.name ?? ''}
                    />
                    <AvatarFallback className='bg-primary/10 text-lg font-bold text-primary'>
                        {initial}
                    </AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1'>
                    <p className='truncate font-semibold text-foreground'>
                        {profile.name ?? t.profile.roleMember}
                    </p>
                    <p className='truncate text-sm text-muted-foreground'>
                        {profile.email}
                    </p>
                    <p className='mt-0.5 text-xs text-subtle-foreground'>
                        {t.profile.memberSince} {memberSinceDate}
                    </p>
                </div>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setEditOpen(true)}>
                    {t.profile.editButton}
                </Button>
            </div>

            {/* Memberships — join happens via session RSVP; each row can be left */}
            <section className='space-y-2'>
                <p className='px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
                    {t.profile.membershipsLabel}
                </p>
                <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card'>
                    {memberships.length === 0 ? (
                        <p className='p-4 text-sm text-muted-foreground'>
                            {t.profile.noMemberships}
                        </p>
                    ) : (
                        memberships.map((m) => (
                            <div
                                key={m.activityId}
                                className='flex items-center gap-3 p-3.5'>
                                <ActivityInitial
                                    name={m.name}
                                    color={m.color}
                                    className='size-9 rounded-sm text-sm'
                                />
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm font-semibold text-foreground'>
                                        {m.name}
                                    </p>
                                    <p className='text-xs text-muted-foreground'>
                                        {t.profile.joinedPrefix} {m.joinedDate}
                                    </p>
                                </div>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground hover:text-destructive'
                                    onClick={() =>
                                        setLeaving({
                                            id: m.activityId,
                                            name: m.name,
                                        })
                                    }>
                                    {t.profile.leaveButton}
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <AccountSettings
                phone={profile.phone}
                onEditPhone={() => setEditOpen(true)}
            />

            <Button
                variant='destructive-outline'
                className='w-full'
                onClick={() => signOut({ callbackUrl: '/' })}>
                <LogOut />
                {t.nav.signOut}
            </Button>

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
        </div>
    );
}

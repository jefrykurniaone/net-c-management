'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The Admin's acts on one member's account: revoke or restore access, and move
 * them between the Member and Admin tiers. An **Owner** row renders none of
 * this — the server refuses every write to an Owner account
 * (docs/owner-role-immutability.md, rule 1), and absence rather than a disabled
 * control is what makes the row read as immutable (ADR 0010).
 */

type Member = Readonly<{
    id: string;
    name: string | null;
    role: Role;
    isActive: boolean;
}>;

type PendingAction = 'toggleActive' | 'toggleRole' | null;

type Patch = Readonly<{ role?: Role; isActive?: boolean }>;

/** The tier this member moves to, and the word for moving them there. */
type RoleSwitch = Readonly<{ role: Role; label: string }>;

/** Everything the controls and their confirmations both need. */
type MemberAct = Readonly<{
    member: Member;
    isSelf: boolean;
    loading: boolean;
    asking: PendingAction;
    ask: (next: PendingAction) => void;
    patch: (data: Patch) => void;
    switchTo: RoleSwitch;
    t: Dictionary;
}>;

/** Shown in a confirmation where a member never filled their name in. */
const EM_DASH = '—';

/** Only two tiers are reachable from here: Owner is not a promotion. */
function roleSwitch(role: Role, t: Dictionary): RoleSwitch {
    if (role === Role.ADMIN) {
        return { role: Role.MEMBER, label: t.admin.makeMember };
    }
    return { role: Role.ADMIN, label: t.admin.makeAdmin };
}

/** The one write both controls make, and the loading state they share. */
function useMemberPatch(memberId: string, t: Dictionary) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function patch(data: Patch) {
        setLoading(true);
        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: memberId, ...data }),
            });
            if (!res.ok) {
                const err = (await res.json()) as { error?: string };
                throw new Error(err.error ?? t.admin.memberUpdateFailed);
            }
            toast.success(t.admin.memberUpdated);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    return { loading, patch };
}

/**
 * Revoking access is high-impact, so it asks first; restoring it is not, so it
 * acts straight away. Neither is offered on your own row: an Admin who revokes
 * themselves cannot undo it.
 */
function MemberControls({ act }: Readonly<{ act: MemberAct }>) {
    const { member, loading, isSelf, t } = act;
    return (
        <>
            <Button
                variant={member.isActive ? 'destructive-outline' : 'outline'}
                size='sm'
                onClick={() =>
                    member.isActive
                        ? act.ask('toggleActive')
                        : act.patch({ isActive: true })
                }
                loading={loading}
                disabled={isSelf}>
                {member.isActive
                    ? t.admin.deactivateMember
                    : t.admin.activateMember}
            </Button>
            {!isSelf && (
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => act.ask('toggleRole')}
                    loading={loading}>
                    {act.switchTo.label}
                </Button>
            )}
        </>
    );
}

function DeactivateDialog({
    open,
    onOpenChange,
    memberName,
    onConfirm,
    t,
}: Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberName: string;
    onConfirm: () => void;
    t: Dictionary;
}>) {
    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            icon={UserX}
            title={t.admin.deactivateConfirmTitle.replace('{name}', memberName)}
            description={t.admin.deactivateConfirmDesc}
            confirmLabel={t.admin.deactivateMember}
            cancelLabel={t.common.cancel}
            typeToConfirm={t.admin.typeToConfirmWord}
            typeToConfirmLabel={t.admin.typeToConfirmPrompt.replace(
                '{word}',
                t.admin.typeToConfirmWord,
            )}
            onConfirm={onConfirm}
        />
    );
}

function RoleDialog({
    open,
    onOpenChange,
    memberName,
    roleLabel,
    onConfirm,
    t,
}: Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberName: string;
    roleLabel: string;
    onConfirm: () => void;
    t: Dictionary;
}>) {
    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            tone='primary'
            icon={ShieldCheck}
            title={t.admin.roleChangeConfirmTitle.replace('{name}', memberName)}
            description={t.admin.roleChangeConfirmDesc}
            confirmLabel={roleLabel}
            cancelLabel={t.common.cancel}
            onConfirm={onConfirm}
        />
    );
}

function MemberDialogs({ act }: Readonly<{ act: MemberAct }>) {
    const close = (open: boolean) => !open && act.ask(null);
    const memberName = act.member.name ?? EM_DASH;
    return (
        <>
            <DeactivateDialog
                open={act.asking === 'toggleActive'}
                onOpenChange={close}
                memberName={memberName}
                onConfirm={() => act.patch({ isActive: false })}
                t={act.t}
            />
            <RoleDialog
                open={act.asking === 'toggleRole'}
                onOpenChange={close}
                memberName={memberName}
                roleLabel={act.switchTo.label}
                onConfirm={() => act.patch({ role: act.switchTo.role })}
                t={act.t}
            />
        </>
    );
}

export function MemberActions({
    member,
    currentUserId,
}: Readonly<{ member: Member; currentUserId: string }>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const { loading, patch } = useMemberPatch(member.id, t);
    const [asking, setAsking] = useState<PendingAction>(null);

    if (member.role === Role.OWNER) {
        return null;
    }

    const act: MemberAct = {
        member,
        isSelf: member.id === currentUserId,
        loading,
        asking,
        ask: setAsking,
        patch,
        switchTo: roleSwitch(member.role, t),
        t,
    };

    return (
        <span className='flex flex-wrap items-center gap-cell'>
            <MemberControls act={act} />
            <MemberDialogs act={act} />
        </span>
    );
}

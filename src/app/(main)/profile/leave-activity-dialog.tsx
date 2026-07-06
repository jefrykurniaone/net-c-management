'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

// Confirm-and-leave an activity. Driven by the parent: `activity` non-null opens
// the dialog for that membership; POSTs the shared memberships endpoint with
// action "leave" (server releases upcoming unpaid/unconfirmed seats), then calls
// onLeft so the parent can refresh the now-shorter membership list.
export function LeaveActivityDialog({
    activity,
    onOpenChange,
    onLeft,
}: Readonly<{
    activity: { id: string; name: string } | null;
    onOpenChange: (open: boolean) => void;
    onLeft: () => void;
}>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [leaving, setLeaving] = useState(false);

    async function handleLeave() {
        if (!activity) return;
        setLeaving(true);
        try {
            const res = await fetch('/api/users/memberships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activityId: activity.id, action: 'leave' }),
            });
            if (!res.ok) throw new Error();
            toast.success(t.profile.leaveToast.replace('{name}', activity.name));
            onLeft();
        } catch {
            toast.error(t.common.error);
        } finally {
            setLeaving(false);
        }
    }

    return (
        <Dialog open={activity !== null} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {t.profile.leaveTitle.replace('{name}', activity?.name ?? '')}
                    </DialogTitle>
                    <DialogDescription>{t.profile.leaveBody}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant='outline'
                        onClick={() => onOpenChange(false)}
                        disabled={leaving}>
                        {t.common.cancel}
                    </Button>
                    <Button
                        variant='destructive'
                        onClick={handleLeave}
                        loading={leaving}>
                        {t.profile.leaveConfirm}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

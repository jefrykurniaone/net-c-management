'use client';

import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { toast } from 'sonner';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function fill(
    template: string,
    values: Record<string, string | number>,
): string {
    return Object.entries(values).reduce(
        (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
        template,
    );
}

export function RemindMembersButton({
    sessionId,
    label,
    lastReminderAt,
}: Readonly<{
    sessionId: string;
    label: string;
    lastReminderAt?: string | null;
}>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);

    const [isOpen, setIsOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Cooldown: check if last reminder was within 24h
    const lastSent = lastReminderAt ? new Date(lastReminderAt) : null;
    const elapsed = lastSent ? Date.now() - lastSent.getTime() : Infinity;
    const isCoolingDown = elapsed < COOLDOWN_MS;
    const hoursSinceSent = lastSent ? Math.floor(elapsed / (60 * 60 * 1000)) : 0;
    const remainingHours = Math.ceil((COOLDOWN_MS - elapsed) / (60 * 60 * 1000));

    const handleSend = async () => {
        setIsSending(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/remind`, {
                method: 'POST',
            });
            const data = (await res.json()) as {
                sent?: number;
                skipped?: number;
                remainingHours?: number;
                error?: string;
            };

            if (res.status === 429) {
                toast.error(
                    fill(t.admin.remindCooldown, {
                        n: hoursSinceSent,
                        remaining: data.remainingHours ?? remainingHours,
                    }),
                );
                return;
            }

            if (!res.ok) {
                toast.error(data.error ?? t.admin.remindErrorToast);
                return;
            }

            if ((data.sent ?? 0) > 0) {
                toast.success(
                    fill(t.admin.remindSuccessToast, { n: data.sent ?? 0 }),
                );
            }
            if ((data.skipped ?? 0) > 0) {
                toast.info(
                    fill(t.admin.remindSkippedToast, { n: data.skipped ?? 0 }),
                );
            }
        } catch {
            toast.error(t.admin.remindErrorToast);
        } finally {
            setIsSending(false);
            setIsOpen(false);
        }
    };

    return (
        <>
            <Button
                size='sm'
                variant='outline'
                disabled={isSending || isCoolingDown}
                title={
                    isCoolingDown
                        ? fill(t.admin.remindCooldown, {
                              n: hoursSinceSent,
                              remaining: remainingHours,
                          })
                        : undefined
                }
                onClick={() => setIsOpen(true)}>
                {isSending ? (
                    <Loader2 className='w-3.5 h-3.5 mr-1.5 animate-spin' />
                ) : null}
                {isCoolingDown
                    ? fill(t.admin.remindCooldown, {
                          n: hoursSinceSent,
                          remaining: remainingHours,
                      })
                    : label}
            </Button>

            <ConfirmDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                title={t.admin.remindConfirmTitle}
                description={t.admin.remindConfirmDesc}
                confirmLabel={
                    isSending ? t.admin.remindSending : t.admin.remindSendBtn
                }
                cancelLabel={t.common.cancel}
                tone='primary'
                icon={Mail}
                onConfirm={handleSend}
            />
        </>
    );
}

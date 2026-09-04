'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import type { SlotCellAction } from './slot-cell-data';

/**
 * Claiming a Seat, or releasing one, from the row the member is already reading.
 *
 * **It adds no seat-holding rule of its own.** Both paths are the routes the
 * session page has always called — `POST …/reserve` and `DELETE …/attendance` —
 * so capacity is still counted under a row lock and a paid Seat is still claimed
 * with a payment hold. The reserve route answers with the bill's own address, so
 * claiming and paying stay one flow.
 */

/**
 * The one case the board hands back to the Session: an Activity that offers both
 * ways to pay, to a member who has never chosen one. Committing to Dues or to
 * per-Session Fees is not a decision to make from a one-line row with neither
 * price on it, so the route says so with a code and the member is taken to the
 * Session, where both prices and the choice already live.
 */
const MODE_REQUIRED = 'MODE_REQUIRED';

interface ReserveResult {
    /** Where to settle the bill behind a held Seat; absent when nothing is due. */
    readonly payUrl?: string | null;
    readonly error?: string;
    readonly code?: string;
}

interface ReleaseResult {
    /** True when Dues already covered the month, so the Session is forfeited. */
    readonly isForfeited?: boolean;
    readonly error?: string;
}

/** A body-less error response is still an error; read it without throwing. */
async function readResult<T>(res: Response): Promise<T> {
    return (await res.json().catch(() => ({}))) as T;
}

interface ActionContext {
    readonly router: ReturnType<typeof useRouter>;
    readonly t: Dictionary;
}

async function claimSeat(sessionId: string, ctx: ActionContext): Promise<void> {
    const res = await fetch(`/api/sessions/${sessionId}/reserve`, {
        method: 'POST',
    });
    const result = await readResult<ReserveResult>(res);
    if (res.ok) {
        // A bill came back with the Seat: same flow, next step.
        if (result.payUrl) {
            ctx.router.push(result.payUrl);
            return;
        }
        toast.success(ctx.t.sessions.boardClaimed);
        ctx.router.refresh();
        return;
    }
    if (result.code === MODE_REQUIRED) {
        toast.info(ctx.t.sessions.boardChooseMode);
        ctx.router.push(`/sessions/${sessionId}`);
        return;
    }
    throw new Error(result.error ?? ctx.t.sessions.toastRegisterError);
}

async function releaseSeat(
    sessionId: string,
    ctx: ActionContext,
): Promise<void> {
    const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: 'DELETE',
    });
    const result = await readResult<ReleaseResult>(res);
    if (!res.ok) {
        throw new Error(result.error ?? ctx.t.sessions.toastCancelError);
    }
    // Dues buy availability for the month, not this Session — say so, so nobody
    // waits for money back that was never owed.
    toast.success(
        result.isForfeited
            ? ctx.t.sessions.boardForfeited
            : ctx.t.sessions.boardWithdrawn,
    );
    ctx.router.refresh();
}

/** Every control on the surface reads the same two words, so each names its own
 *  Session to a screen reader. */
function actionCopy(
    action: SlotCellAction,
    title: string,
    t: Dictionary,
): { label: string; aria: string } {
    if (action.kind === 'withdraw') {
        return {
            label: t.sessions.boardWithdraw,
            aria: t.sessions.boardWithdrawAria.replace('{title}', title),
        };
    }
    return {
        label: action.isPaid
            ? t.sessions.boardClaimAndPay
            : t.sessions.boardClaim,
        aria: t.sessions.boardClaimAria.replace('{title}', title),
    };
}

export function SeatAction({
    action,
    title,
}: Readonly<{ action: SlotCellAction; title: string }>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [isBusy, setIsBusy] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const wasPressed = useRef(false);

    /**
     * Put focus back on the control the member just used.
     *
     * While the write is in flight the button is `disabled`, and a disabled
     * element cannot hold focus — the browser drops it to `<body>`. For a
     * keyboard member that means releasing a Seat throws them to the top of the
     * document and they tab back down a whole week of rows to reach the row they
     * were already on. The control keeps its place in the row either way; only
     * its label changes, from Withdraw to Claim and back.
     */
    useEffect(() => {
        if (isBusy || !wasPressed.current) return;
        wasPressed.current = false;
        buttonRef.current?.focus();
    }, [isBusy]);

    async function run(): Promise<void> {
        wasPressed.current = true;
        setIsBusy(true);
        const ctx: ActionContext = { router, t };
        try {
            if (action.kind === 'withdraw') {
                await releaseSeat(action.sessionId, ctx);
            } else {
                await claimSeat(action.sessionId, ctx);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setIsBusy(false);
        }
    }

    const copy = actionCopy(action, title, t);
    return (
        <Button
            ref={buttonRef}
            type='button'
            size='sm'
            variant={action.kind === 'withdraw' ? 'outline' : 'default'}
            loading={isBusy}
            onClick={run}
            aria-label={copy.aria}>
            {copy.label}
        </Button>
    );
}

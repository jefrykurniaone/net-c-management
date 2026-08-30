'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { AttendanceStatus } from '@prisma/client';
import { Register } from '@/components/admin/register';
import type { RegisterColumn } from '@/components/admin/register-columns';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';
import {
    changedRows,
    draftStatusOf,
    prefillPresent,
    pruneAppliedEdits,
    type AdminSettableStatus,
    type AttendanceEdits,
    type BulkAttendanceRow,
} from '@/lib/attendance-admin';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import type { RawSearchParams } from '@/lib/table-params';
import {
    MoneyCell,
    ParticipantIdentity,
    PaymentModeCell,
    RecordCell,
    RecordedChip,
} from './attendance-cells';
import {
    UNTAKEN_NOTICE_ID,
    type AttendanceRegisterRow,
} from './attendance-view';

/**
 * Taking attendance for one Session: the shared register, one row per Seat, a
 * four-state control on each, and **one Save for the whole list**.
 *
 * The Admin's edits live here and nowhere else until Save. Only the rows they
 * changed are sent, so a Session opened and saved without a touch is unchanged
 * in the database, timestamps included — untaken attendance stays Registered and
 * a No-Show is never implied by saving. "Mark everyone Present" moves controls
 * on this side of the wire and writes nothing on its own.
 */

/** How each row reads on screen, and what changing one does. */
function useAttendanceDraft(rows: readonly AttendanceRegisterRow[]) {
    const [held, setHeld] = useState<AttendanceEdits>({});

    // Derived on every render, never stored: an edit the server has caught up
    // with stops being an edit the moment fresh rows arrive, and one it has not
    // is kept — so a save in flight never blinks back to the value the Admin
    // just replaced, and there is no state here to fall out of step.
    const edits = pruneAppliedEdits(rows, held);

    function setStatus(userId: string, status: AdminSettableStatus): void {
        setHeld({ ...edits, [userId]: status });
    }

    function markAllPresent(): void {
        setHeld(prefillPresent(rows, edits));
    }

    return { edits, setStatus, markAllPresent };
}

/**
 * The write. Only changed rows travel; the server writes only what it receives,
 * and a refusal is reported in the Admin's own language rather than by relaying
 * the route's machine string.
 */
function useAttendanceSave(sessionId: string, t: Dictionary) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    async function save(rows: readonly BulkAttendanceRow[]): Promise<void> {
        setIsSaving(true);
        try {
            const res = await fetch(
                `/api/sessions/${sessionId}/attendance/bulk`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rows }),
                },
            );
            if (!res.ok) {
                throw new Error(t.admin.attendanceUpdateFailed);
            }
            toast.success(t.admin.attendanceUpdated);
            router.refresh();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : t.common.error,
            );
        } finally {
            setIsSaving(false);
        }
    }

    return { isSaving, save };
}

interface ColumnDeps {
    t: Dictionary;
    hasFee: boolean;
    draftOf: (row: AttendanceRegisterRow) => AttendanceStatus;
    onSelect: (userId: string, status: AdminSettableStatus) => void;
}

/**
 * Whether money is behind this Seat — a column only a Session that charges a Fee
 * has. On a free Session there is nothing to be behind it, and a column reading
 * the same thing down forty rows says nothing.
 */
function moneyColumn(t: Dictionary): RegisterColumn<AttendanceRegisterRow> {
    return {
        key: 'money',
        head: t.admin.colSessionPayment,
        kind: 'standing',
        render: (row) => <MoneyCell money={row.money} t={t} />,
    };
}

/**
 * The columns, in the order the Admin reads them: who, how they pay, whether the
 * money is behind them, what is recorded, and the decision itself. Position,
 * rules and collapse are the register's; only the values are described here.
 */
function attendanceColumns(
    deps: ColumnDeps,
): readonly RegisterColumn<AttendanceRegisterRow>[] {
    const { t, hasFee, draftOf, onSelect } = deps;
    return [
        {
            key: 'participant',
            head: t.admin.colParticipant,
            render: (row) => <ParticipantIdentity row={row} t={t} />,
        },
        {
            key: 'mode',
            head: t.admin.colPaymentMode,
            render: (row) => <PaymentModeCell row={row} t={t} />,
        },
        ...(hasFee ? [moneyColumn(t)] : []),
        {
            key: 'recorded',
            head: t.admin.colRecorded,
            kind: 'standing',
            render: (row) => <RecordedChip status={row.status} t={t} />,
        },
        {
            key: 'record',
            head: t.admin.colRecord,
            kind: 'actions',
            render: (row) => (
                <RecordCell
                    row={row}
                    draft={draftOf(row)}
                    t={t}
                    onSelect={(status) => onSelect(row.userId, status)}
                />
            ),
        },
    ];
}

interface SaveBarProps {
    t: Dictionary;
    changedCount: number;
    isSaving: boolean;
    onMarkAllPresent: () => void;
}

/** The prefill and the one Save, with how much is waiting on it said plainly. */
function SaveBar({
    t,
    changedCount,
    isSaving,
    onMarkAllPresent,
}: Readonly<SaveBarProps>) {
    return (
        <div className='flex flex-wrap items-center gap-cell'>
            <Button type='submit' loading={isSaving} disabled={changedCount === 0}>
                {t.admin.attSaveBtn}
            </Button>
            <Button
                type='button'
                variant='outline'
                onClick={onMarkAllPresent}
                disabled={isSaving}>
                {t.admin.markAllPresent}
            </Button>
            <span className='type-caption text-muted-foreground'>
                {changedCount === 0
                    ? t.admin.attNoChanges
                    : t.admin.attChangedCount.replace(
                          '{n}',
                          String(changedCount),
                      )}
            </span>
        </div>
    );
}

interface DraftRegisterProps {
    rows: readonly AttendanceRegisterRow[];
    searchParams: RawSearchParams;
    deps: ColumnDeps;
}

/** The shared register, described as data and nothing else. */
function DraftRegister({
    rows,
    searchParams,
    deps,
}: Readonly<DraftRegisterProps>) {
    return (
        <Register
            columns={attendanceColumns(deps)}
            rows={rows}
            caption={deps.t.admin.attendanceCaption}
            searchParams={searchParams}
            empty={{
                mark: deps.t.admin.attendanceEmptyMark,
                text: deps.t.admin.attendanceEmpty,
            }}
        />
    );
}

/**
 * Save, as the form's own submit — so Enter from any control in the register
 * saves, and a keyboard is as complete a way through this surface as a mouse.
 * Nothing goes out when nothing changed.
 */
function submitHandler(
    changed: readonly BulkAttendanceRow[],
    save: (rows: readonly BulkAttendanceRow[]) => Promise<void>,
) {
    return (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (changed.length > 0) {
            void save(changed);
        }
    };
}

interface AttendanceRegisterProps {
    sessionId: string;
    rows: readonly AttendanceRegisterRow[];
    searchParams: RawSearchParams;
    isUntaken: boolean;
    hasFee: boolean;
}

export function AttendanceRegister({
    sessionId,
    rows,
    searchParams,
    isUntaken,
    hasFee,
}: Readonly<AttendanceRegisterProps>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const { edits, setStatus, markAllPresent } = useAttendanceDraft(rows);
    const { isSaving, save } = useAttendanceSave(sessionId, t);
    const changed = changedRows(rows, edits);

    return (
        <form
            onSubmit={submitHandler(changed, save)}
            aria-describedby={isUntaken ? UNTAKEN_NOTICE_ID : undefined}
            className='space-y-bay'>
            <SaveBar
                t={t}
                changedCount={changed.length}
                isSaving={isSaving}
                onMarkAllPresent={markAllPresent}
            />
            <DraftRegister
                rows={rows}
                searchParams={searchParams}
                deps={{
                    t,
                    hasFee,
                    draftOf: (row) => draftStatusOf(row, edits),
                    onSelect: setStatus,
                }}
            />
        </form>
    );
}

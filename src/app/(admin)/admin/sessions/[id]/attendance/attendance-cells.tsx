import type { AttendanceStatus } from '@prisma/client';
import { Chip, StatusChip } from '@/components/ui/chip';
import {
    ADMIN_SETTABLE_STATUSES,
    type AdminSettableStatus,
} from '@/lib/attendance-admin';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import {
    attendanceState,
    paymentState,
    resolveStatusChip,
} from '@/lib/status-chip';
import { cn } from '@/lib/utils';
import type { AttendanceRegisterRow, MoneyStanding } from './attendance-view';

/**
 * The values one attendance row holds. The register owns where each of these
 * lands and how it rules; these own only what a single value looks like.
 */

/** Nothing to draw — a member with no name, an Activity offering no mode. */
const EM_DASH = '—';

/** What to call this Participant. A Seat can be held before a name reaches us. */
export function participantLabel(row: AttendanceRegisterRow): string {
    return row.name ?? row.email ?? EM_DASH;
}

/**
 * The label for one attendance value, taken from the chip resolver rather than
 * picked here, so the control and the chip beside it can never disagree — and so
 * the stored `ABSENT` reads as **Opted Out** wherever it appears.
 */
export function statusLabel(status: AttendanceStatus, t: Dictionary): string {
    return t.chips[resolveStatusChip(attendanceState(status)).labelKey];
}

/**
 * The email under the name, or the word that says why an Admin cannot see it.
 * Withheld rather than blank, exactly as the Members register draws it
 * (docs/owner-role-immutability.md).
 */
function ParticipantContact({
    row,
    t,
}: Readonly<{ row: AttendanceRegisterRow; t: Dictionary }>) {
    if (row.isContactWithheld) {
        return (
            <span className='type-caption text-muted-foreground'>
                {t.admin.contactWithheld}
            </span>
        );
    }
    if (row.name === null || row.email === null) {
        return null;
    }
    return (
        <span className='type-caption break-all text-muted-foreground'>
            {row.email}
        </span>
    );
}

/** Who they are, and how to tell two members of the same name apart. */
export function ParticipantIdentity({
    row,
    t,
}: Readonly<{ row: AttendanceRegisterRow; t: Dictionary }>) {
    return (
        <span className='flex min-w-0 flex-col gap-hair'>
            <span className='type-title text-foreground'>
                {participantLabel(row)}
            </span>
            <ParticipantContact row={row} t={t} />
        </span>
    );
}

/** How this Participant pays for the Activity in this Session's period. */
export function PaymentModeCell({
    row,
    t,
}: Readonly<{ row: AttendanceRegisterRow; t: Dictionary }>) {
    if (row.mode === null) {
        return (
            <span className='type-caption text-muted-foreground'>
                {EM_DASH}
            </span>
        );
    }
    return (
        <span className='type-body text-foreground'>
            {row.mode === 'MONTHLY'
                ? t.paymentMode.monthly
                : t.paymentMode.perSession}
        </span>
    );
}

/**
 * Whether money stands behind this Seat. A Payment that exists is drawn through
 * the resolver at its own standing; nothing sent takes a **neutral** chip —
 * nobody has placed it, which is not the same as a failure.
 */
export function MoneyCell({
    money,
    t,
}: Readonly<{ money: MoneyStanding; t: Dictionary }>) {
    if (money.kind === 'none') {
        return <Chip variant='neutral' label={t.admin.attMoneyNone} />;
    }
    return <StatusChip state={paymentState(money.status)} labels={t.chips} />;
}

/** What is stored against this Seat right now, as its chip. */
export function RecordedChip({
    status,
    t,
}: Readonly<{ status: AttendanceStatus; t: Dictionary }>) {
    return <StatusChip state={attendanceState(status)} labels={t.chips} />;
}

/* The `2px` corner is the retired board radius. Rally's ladder gives a control
   8px, but restyling this option is the admin surface's own ticket, so it is
   left standing here rather than changed in passing. */
const OPTION_BASE_CLASS =
    'inline-flex min-h-11 cursor-pointer items-center gap-hair rounded-[2px] border px-cell py-hair type-label focus-within:border-ring focus-within:ring-2 focus-within:ring-ring';

const OPTION_SELECTED_CLASS = 'border-border bg-accent text-foreground';

const OPTION_REST_CLASS = 'border-transparent text-muted-foreground';

interface StatusOptionProps {
    status: AdminSettableStatus;
    groupName: string;
    isSelected: boolean;
    label: string;
    ariaLabel: string;
    onSelect: () => void;
}

/**
 * One of the four values, as a native radio inside its own visible label — so
 * the group is keyboard-complete, its focus ring is the browser's own plus the
 * cell's, and selection is carried by the radio's form before the cell's fill.
 *
 * The accessible name names the member too: a register is forty rows deep, and
 * "Present, radio 2 of 4" on its own does not say whose Seat it is.
 */
function StatusOption({
    status,
    groupName,
    isSelected,
    label,
    ariaLabel,
    onSelect,
}: Readonly<StatusOptionProps>) {
    return (
        <label
            className={cn(
                OPTION_BASE_CLASS,
                isSelected ? OPTION_SELECTED_CLASS : OPTION_REST_CLASS,
            )}>
            <input
                type='radio'
                name={groupName}
                value={status}
                checked={isSelected}
                onChange={onSelect}
                aria-label={ariaLabel}
                className='size-4 shrink-0 accent-primary'
            />
            {label}
        </label>
    );
}

interface StatusControlProps {
    row: AttendanceRegisterRow;
    draft: AttendanceStatus;
    t: Dictionary;
    onSelect: (status: AdminSettableStatus) => void;
}

/**
 * The decision cell: the four-state control, and a plain word under it where the
 * Admin has moved a row and not saved it yet. Said in words rather than a
 * colour, so the register still reads with colour taken away.
 */
export function RecordCell({
    row,
    draft,
    t,
    onSelect,
}: Readonly<StatusControlProps>) {
    return (
        <span className='flex flex-col items-start gap-hair md:items-end'>
            <StatusControl row={row} draft={draft} t={t} onSelect={onSelect} />
            {draft !== row.status && (
                <span className='type-caption text-muted-foreground'>
                    {t.admin.attUnsaved}
                </span>
            )}
        </span>
    );
}

/**
 * The four-state control for one row: Registered, Present, Opted Out, No-Show.
 * `MAYBE` is not among them and never can be — it is the member's own tentative
 * RSVP, and an Admin recording it would be putting words in their mouth.
 */
function StatusControl({
    row,
    draft,
    t,
    onSelect,
}: Readonly<StatusControlProps>) {
    const name = participantLabel(row);
    return (
        <span className='flex flex-wrap items-center gap-hair md:justify-end'>
            {ADMIN_SETTABLE_STATUSES.map((status) => {
                const label = statusLabel(status, t);
                return (
                    <StatusOption
                        key={status}
                        status={status}
                        groupName={`attendance-${row.userId}`}
                        isSelected={draft === status}
                        label={label}
                        ariaLabel={t.admin.attRowControlLabel
                            .replace('{status}', label)
                            .replace('{name}', name)}
                        onSelect={() => onSelect(status)}
                    />
                );
            })}
        </span>
    );
}

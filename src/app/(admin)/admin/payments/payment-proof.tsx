'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { isOptimisableProofUrl } from '@/lib/proof-host';
import { cn } from '@/lib/utils';

/**
 * The Proof, at a size forty of them can be scanned at.
 *
 * Proofs are public storage URLs and stay that way — no new serving route, no
 * storage-plan feature, and the service-role boundary does not move. What keeps
 * forty rows from being forty full-size bank screenshots is the framework's own
 * optimiser, pointed at the storage host `next.config.ts` already allows: the
 * thumbnail is requested at a fixed 48×64 box, so what crosses the wire is a
 * 48px-wide render (96px on a 2x screen), not the original.
 *
 * **The optimiser is offered only the host it is configured for.** Its loader
 * throws on an unlisted host, at render time rather than through `onError`, so
 * a single Payment carrying a strange Proof URL used to blank the entire queue
 * (#88). Anything `isOptimisableProofUrl` cannot vouch for renders `unoptimized`
 * instead: same box, same button, same dialog, no loader and therefore no host
 * check — and a genuine load failure reaches `onError` again, where the designed
 * failure cell is waiting. Every Proof written by the upload route is on the
 * storage host, so real data is unaffected and the weight criterion holds; this
 * is the anomaly path, and it degrades rather than crashing.
 *
 * Two cells here are not images at all and are designed as cells rather than
 * left to the browser's broken-image glyph: a Payment with no Proof, and a
 * Proof whose URL will not load. Neither uses a mark — the register keeps every
 * mark on the standing column's shared edge, so a second mark in this column
 * would break the one line every mark on the surface lands on.
 */

/**
 * Read as a whole static expression so the bundler inlines it: a `NEXT_PUBLIC_`
 * value reaches the browser only when it is written out literally.
 */
const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** The box, in CSS pixels. `next/image` asks the optimiser for exactly this. */
const THUMB_WIDTH = 48;
const THUMB_HEIGHT = 64;

/**
 * The box never changes size with the viewport, so the browser is told so
 * outright and never reaches for a wider candidate than the one it needs.
 */
const THUMB_SIZES = '48px';

/**
 * Opened full size, the Proof is read rather than scanned, so it is asked for
 * at dialog width. It is fetched only when the dialog mounts, which is why the
 * queue's own weight is unaffected by it.
 */
const FULL_WIDTH = 1200;
const FULL_HEIGHT = 1600;
const FULL_SIZES = '(max-width: 640px) 90vw, 560px';

const BOX_CLASS = 'flex h-16 w-12 shrink-0 items-center justify-center';

const FOCUS_CLASS =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export type ProofLabels = Readonly<{
    /** No Proof was ever sent with this Payment. */
    none: string;
    /** A Proof is on the Payment and its URL did not load. */
    failed: string;
    /** The thumbnail button's accessible name. */
    open: string;
    /** The dialog's own heading. */
    title: string;
    /** Activity and Billing Period, so the opened Proof still says which row. */
    caption: string;
}>;

/** Nothing was sent: a dashed box, the same size as the ones that hold one. */
function NoProofCell({ label }: Readonly<{ label: string }>) {
    return (
        <span className='flex flex-col items-start gap-hair'>
            <span
                aria-hidden
                className={cn(BOX_CLASS, 'border border-dashed border-rule')}
            />
            <span className='type-caption text-muted-foreground'>{label}</span>
        </span>
    );
}

/** A Proof that will not load. Ruled, not dashed: something is there. */
function FailedProofCell({ label }: Readonly<{ label: string }>) {
    return (
        <span className='flex flex-col items-start gap-hair'>
            <span className={cn(BOX_CLASS, 'border border-rule bg-board')}>
                <ImageOff aria-hidden className='size-4 text-destructive' />
            </span>
            <span className='type-caption text-destructive'>{label}</span>
        </span>
    );
}

/** The Proof full size, in the shared dialog. */
function FullProof({
    src,
    labels,
    isOptimisable,
}: Readonly<{ src: string; labels: ProofLabels; isOptimisable: boolean }>) {
    return (
        <DialogContent className='sm:max-w-xl'>
            <DialogHeader>
                <DialogTitle>{labels.title}</DialogTitle>
                <DialogDescription>{labels.caption}</DialogDescription>
            </DialogHeader>
            <Image
                src={src}
                alt={labels.title}
                width={FULL_WIDTH}
                height={FULL_HEIGHT}
                sizes={FULL_SIZES}
                unoptimized={!isOptimisable}
                className='h-auto max-h-[70vh] w-full border border-rule bg-board object-contain'
            />
        </DialogContent>
    );
}

type OpenableProofProps = Readonly<{
    src: string;
    labels: ProofLabels;
    /** False for anything the optimiser's host allow-list would reject. */
    isOptimisable: boolean;
    onFailed: () => void;
}>;

/**
 * A Proof that loaded: the thumbnail, and the way into the full-size dialog.
 *
 * The `<button>` stays a real element directly under `DialogTrigger asChild` —
 * that is how Radix merges its own handlers and ref onto the row's control, and
 * a component in its place would swallow them.
 */
function OpenableProof({
    src,
    labels,
    isOptimisable,
    onFailed,
}: OpenableProofProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type='button'
                    aria-label={labels.open}
                    className={cn(
                        BOX_CLASS,
                        'border border-rule bg-board',
                        FOCUS_CLASS,
                    )}>
                    <Image
                        src={src}
                        alt=''
                        width={THUMB_WIDTH}
                        height={THUMB_HEIGHT}
                        sizes={THUMB_SIZES}
                        unoptimized={!isOptimisable}
                        onError={onFailed}
                        className='h-16 w-12 object-cover'
                    />
                </button>
            </DialogTrigger>
            <FullProof
                src={src}
                labels={labels}
                isOptimisable={isOptimisable}
            />
        </Dialog>
    );
}

/**
 * The row's Proof, in one of three states. The thumbnail is a real `<button>`,
 * so it is reached by Tab in the row's own order and opens with Enter — no
 * single-key shortcut anywhere near a money decision. Radix hands focus back to
 * that same button when the dialog closes, which is what returns the Admin to
 * the row they left.
 */
export function PaymentProof({
    proofUrl,
    labels,
}: Readonly<{ proofUrl: string | null; labels: ProofLabels }>) {
    const [hasFailed, setHasFailed] = useState(false);

    const src = proofUrl?.trim() ?? '';
    if (src === '') {
        return <NoProofCell label={labels.none} />;
    }
    if (hasFailed) {
        return <FailedProofCell label={labels.failed} />;
    }
    return (
        <OpenableProof
            src={src}
            labels={labels}
            isOptimisable={isOptimisableProofUrl(src, STORAGE_BASE_URL)}
            onFailed={() => setHasFailed(true)}
        />
    );
}

'use client';

import type { ChangeEvent } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { PROOF_ACCEPT } from '@/lib/proof-file';

/** Bytes in a kilobyte, for the chosen file's size line. */
const BYTES_PER_KB = 1024;

/**
 * The transfer image itself — an empty slot with a dashed edge until something
 * is placed in it. The input stays a real, reachable control rather than a
 * hidden one: it carries the focus ring on the whole slot, so the drop area is
 * operable from the keyboard and not only by pointer.
 */
export function ProofFileField({
    t,
    file,
    preview,
    onChange,
}: Readonly<{
    t: Dictionary;
    file: File | null;
    preview: string | null;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}>) {
    return (
        <div className='space-y-hair'>
            <Label htmlFor='proof-file'>{t.payments.fileLabel}</Label>
            {/* The slot wraps its own input, which is what associates the two —
                no `htmlFor`, so a click on the input cannot be forwarded back
                to it and open the picker twice. */}
            <label className='relative flex h-40 w-full cursor-pointer flex-col items-center justify-center overflow-hidden border border-dashed border-border bg-card transition-colors hover:border-primary has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50'>
                {preview ? (
                    <Image
                        src={preview}
                        alt={t.payments.fileLabel}
                        fill
                        className='object-cover'
                    />
                ) : (
                    <span className='pointer-events-none flex flex-col items-center gap-hair text-center'>
                        <ImageIcon
                            aria-hidden='true'
                            className='size-5 text-secondary-foreground'
                        />
                        <span className='type-title text-card-foreground'>
                            {t.payments.uploadReceipt}
                        </span>
                        <span className='type-caption text-secondary-foreground'>
                            {t.payments.fileDesc}
                        </span>
                    </span>
                )}
                <input
                    id='proof-file'
                    type='file'
                    accept={PROOF_ACCEPT}
                    onChange={onChange}
                    className='sr-only'
                />
            </label>
            {file && (
                <p className='truncate type-caption tabular-nums text-secondary-foreground'>
                    {file.name} ({(file.size / BYTES_PER_KB).toFixed(0)} KB)
                </p>
            )}
        </div>
    );
}

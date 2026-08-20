'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { TASK_MEASURE } from '@/components/layout/measure';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { NoMonthlyDues } from '@/components/payments/no-monthly-dues';
import { ProofUploadForm } from '@/components/payments/proof-upload-form';
import {
    resolveProofUploadCase,
    type MembershipRow,
    type ProofUploadCase,
} from '@/lib/proof-upload-cases';

/**
 * A single-task column, so it takes the 40rem measure rather than the wider
 * one a surface carrying a whole schedule takes (DESIGN.md, Layout).
 */
const TASK_COLUMN = `${TASK_MEASURE} space-y-block`;

const NOW = new Date();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_YEAR = NOW.getFullYear();

type LoadStatus = 'loading' | 'loaded' | 'error';

/**
 * Proof of a monthly-dues transfer.
 *
 * Only an Activity whose resolved payment mode for the current period is
 * monthly can raise a monthly charge, and that resolution is the server's — it
 * arrives on each row of the memberships GET. When it yields nothing, this page
 * says which of the causes applies rather than rendering an empty select:
 * see `resolveProofUploadCase`.
 */
export default function UploadPaymentPage() {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [status, setStatus] = useState<LoadStatus>('loading');
    const [result, setResult] = useState<ProofUploadCase>({
        kind: 'noActivity',
    });

    useEffect(() => {
        fetch('/api/users/memberships')
            .then((res) => {
                if (!res.ok) throw new Error('fetch failed');
                return res.json();
            })
            .then((data: { activities?: MembershipRow[] }) => {
                setResult(resolveProofUploadCase(data.activities ?? []));
                setStatus('loaded');
            })
            .catch(() => setStatus('error'));
    }, []);

    const periodLabel = `${t.months[CURRENT_MONTH]} ${CURRENT_YEAR}`;

    if (status !== 'loaded') {
        return (
            <TaskColumn t={t}>
                <p className='border border-rule bg-tile p-block type-body text-secondary-foreground'>
                    {status === 'loading' ? t.common.loading : t.common.error}
                </p>
            </TaskColumn>
        );
    }

    if (result.kind !== 'monthly') {
        return (
            <TaskColumn t={t}>
                <NoMonthlyDues
                    t={t}
                    result={result}
                    periodLabel={periodLabel}
                />
            </TaskColumn>
        );
    }

    return (
        <TaskColumn t={t}>
            <section className='border border-rule bg-tile'>
                <div className='border-b border-rule p-block'>
                    <h1 className='type-display text-card-foreground'>
                        {t.payments.uploadTitle}
                    </h1>
                </div>
                <div className='p-block'>
                    <ProofUploadForm
                        t={t}
                        activities={result.activities}
                        month={CURRENT_MONTH}
                        year={CURRENT_YEAR}
                        periodLabel={periodLabel}
                    />
                </div>
            </section>
        </TaskColumn>
    );
}

/** The column every state of this screen sits in, and the way back out of it. */
function TaskColumn({
    t,
    children,
}: Readonly<{ t: Dictionary; children: ReactNode }>) {
    return (
        <div className={TASK_COLUMN}>
            <Link
                href='/payments'
                className='inline-flex items-center gap-cell type-label text-secondary-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2'>
                <ArrowLeft aria-hidden='true' className='size-4' />
                {t.payments.backToHistory}
            </Link>
            {children}
        </div>
    );
}

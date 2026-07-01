import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Shapes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EkskulBadge } from '@/components/ekskul/ekskul-badge';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isAdminRole } from '@/lib/utils';
import { NewEkskulButton, EkskulActions } from './ekskul-actions';
import { EkskulCards } from './ekskul-cards';

export default async function AdminEkskulPage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role))
        redirect('/dashboard');

    const t = getDictionary(locale);

    const ekskuls = await prisma.ekskul.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        include: {
            _count: { select: { memberships: true, sessions: true } },
        },
    });

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between flex-wrap gap-3'>
                <div>
                    <h1 className='text-2xl font-bold text-foreground flex items-center gap-2'>
                        <Shapes className='w-6 h-6 text-primary' />
                        {t.admin.ekskulTitle}
                    </h1>
                    <p className='text-sm text-muted-foreground mt-1'>
                        {ekskuls.length} {t.admin.ekskulRegistered} ·{' '}
                        {t.admin.ekskulSubtitle}
                    </p>
                </div>
                <NewEkskulButton />
            </div>

            {/* Mobile: stacked cards (< md) */}
            <div className='md:hidden'>
                <EkskulCards ekskuls={ekskuls} t={t} />
            </div>

            {/* Desktop: full table (>= md) */}
            <div className='hidden md:block bg-card rounded-xl border border-border overflow-hidden'>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-muted border-b border-border'>
                                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colEkskul}
                                </th>
                                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.ekskulSlug}
                                </th>
                                <th className='text-center px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colMembers}
                                </th>
                                <th className='text-right px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.ekskulFee}
                                </th>
                                <th className='text-center px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colStatus}
                                </th>
                                <th className='text-right px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colActions}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {ekskuls.map((e) => (
                                <tr
                                    key={e.id}
                                    className='border-b border-border hover:bg-muted'>
                                    <td className='px-4 py-3'>
                                        <div className='flex items-center gap-2'>
                                            <EkskulBadge
                                                name={e.name}
                                                color={e.color}
                                            />
                                        </div>
                                        {e.description && (
                                            <p className='text-xs text-muted-foreground mt-1 max-w-xs truncate'>
                                                {e.description}
                                            </p>
                                        )}
                                    </td>
                                    <td className='px-4 py-3 text-muted-foreground font-mono text-xs'>
                                        {e.slug}
                                    </td>
                                    <td className='px-4 py-3 text-center text-muted-foreground tabular-nums'>
                                        {e._count.memberships}
                                    </td>
                                    <td className='px-4 py-3 text-right text-muted-foreground whitespace-nowrap tabular-nums'>
                                        Rp {e.monthlyFee.toLocaleString('id-ID')}
                                    </td>
                                    <td className='px-4 py-3 text-center'>
                                        <Badge
                                            variant={
                                                e.isActive
                                                    ? 'default'
                                                    : 'secondary'
                                            }>
                                            {e.isActive
                                                ? t.admin.active
                                                : t.admin.inactive2}
                                        </Badge>
                                    </td>
                                    <td className='px-4 py-3'>
                                        <EkskulActions
                                            ekskul={{
                                                id: e.id,
                                                name: e.name,
                                                slug: e.slug,
                                                color: e.color,
                                                description: e.description,
                                                monthlyFee: e.monthlyFee,
                                                sessionFee: e.sessionFee,
                                                allowsMonthly: e.allowsMonthly,
                                                allowsPerSession:
                                                    e.allowsPerSession,
                                                defaultLocation:
                                                    e.defaultLocation,
                                                maxPlayers: e.maxPlayers,
                                                adminWhatsapp: e.adminWhatsapp,
                                                isActive: e.isActive,
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {ekskuls.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className='px-4 py-8 text-center text-muted-foreground'>
                                        {t.admin.noEkskul}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

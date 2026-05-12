'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    CalendarDays,
    CreditCard,
    Users,
    Settings,
    LogOut,
    ChevronRight,
    ShieldCheck,
    User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, communityAbbr } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Sidebar({
    communityName,
    logoUrl,
}: Readonly<{ communityName: string; logoUrl?: string }>) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { locale } = useLocale();
    const t = getDictionary(locale);

    const isAdmin = session?.user?.role === 'ADMIN';
    const initials =
        session?.user?.name
            ?.split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase() ?? '?';

    const MEMBER_NAV = [
        { label: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
        { label: t.nav.sessions, href: '/sessions', icon: CalendarDays },
        { label: t.nav.payments, href: '/payments', icon: CreditCard },
    ];

    const ADMIN_NAV = [
        { label: t.nav.adminDashboard, href: '/admin', icon: ShieldCheck },
        {
            label: t.nav.adminSessions,
            href: '/admin/sessions',
            icon: CalendarDays,
        },
        {
            label: t.nav.adminPayments,
            href: '/admin/payments',
            icon: CreditCard,
        },
        { label: t.nav.adminMembers, href: '/admin/members', icon: Users },
        { label: t.nav.adminSettings, href: '/admin/settings', icon: Settings },
    ];

    return (
        <aside className='flex flex-col h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700'>
            {/* Logo */}
            <div className='flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800'>
                {logoUrl ? (
                    <Image
                        src={logoUrl}
                        alt={communityName}
                        width={36}
                        height={36}
                        className='w-9 h-9 rounded-full object-cover shrink-0'
                    />
                ) : (
                    <div className='w-9 h-9 bg-green-600 rounded-full flex items-center justify-center shrink-0'>
                        <span className='text-white font-bold text-sm'>
                            {communityAbbr(communityName)}
                        </span>
                    </div>
                )}
                <div>
                    <p className='font-bold text-gray-900 dark:text-white text-sm leading-tight'>
                        {communityName}
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className='flex-1 px-3 py-4 space-y-1 overflow-y-auto'>
                {/* Member nav */}
                <p className='px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
                    {t.nav.mainLabel}
                </p>
                {MEMBER_NAV.map(({ label, href, icon: Icon }) => {
                    const isActive =
                        pathname === href || pathname.startsWith(href + '/');
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
                            )}>
                            <Icon className='w-4 h-4 shrink-0' />
                            {label}
                            {isActive && (
                                <ChevronRight className='w-3 h-3 ml-auto text-green-600 dark:text-green-400' />
                            )}
                        </Link>
                    );
                })}

                {/* Admin nav */}
                {isAdmin && (
                    <div className='pt-4'>
                        <p className='px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
                            {t.nav.adminLabel}
                        </p>
                        {ADMIN_NAV.map(({ label, href, icon: Icon }) => {
                            const isActive =
                                pathname === href ||
                                (href !== '/admin' &&
                                    pathname.startsWith(href + '/'));
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
                                    )}>
                                    <Icon className='w-4 h-4 shrink-0' />
                                    {label}
                                    {isActive && (
                                        <ChevronRight className='w-3 h-3 ml-auto text-purple-600 dark:text-purple-400' />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </nav>

            {/* User info + logout */}
            <div className='border-t border-gray-100 dark:border-gray-800 p-4'>
                <div className='flex items-center gap-3 mb-3'>
                    <Avatar className='w-8 h-8'>
                        <AvatarImage
                            src={session?.user?.image ?? ''}
                            alt={session?.user?.name ?? ''}
                        />
                        <AvatarFallback className='bg-green-100 text-green-700 text-xs font-semibold'>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                            {session?.user?.name ?? '—'}
                        </p>
                        <p className='text-xs text-gray-400 truncate'>
                            {session?.user?.email ?? '—'}
                        </p>
                    </div>
                </div>
                <Link
                    href='/profile'
                    className='flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full'>
                    <User className='w-4 h-4 shrink-0' />
                    {t.nav.profile}
                </Link>
                <LanguageSwitcher />
                <ThemeToggle />
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className='flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors px-1 py-1 mt-1 w-full rounded hover:bg-red-50 dark:hover:bg-red-900/20'>
                    <LogOut className='w-4 h-4' />
                    {t.nav.signOut}
                </button>
            </div>
        </aside>
    );
}

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

// DEV-ONLY page. Lets you log in as any existing user without Google OAuth, so
// you can test the seeded OWNER / ADMIN / MEMBER (whose placeholder emails aren't
// real Google accounts). Returns 404 in production. Strings are intentionally
// hardcoded — this page is a developer tool and never reaches end users.
export default async function DevLoginPage() {
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }

    const users = await prisma.user.findMany({
        orderBy: { role: 'asc' },
        select: { id: true, email: true, name: true, role: true },
    });

    return (
        <div className='min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800'>
            <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-6'>
                <div className='flex flex-col items-center gap-1 text-center'>
                    <span className='text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400'>
                        Development only
                    </span>
                    <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                        Dev Login
                    </h1>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Bypasses Google OAuth. Pick a user to sign in as.
                    </p>
                </div>

                <div className='w-full border-t border-gray-100 dark:border-gray-700' />

                {users.length === 0 ? (
                    <p className='text-sm text-gray-500 dark:text-gray-400 text-center'>
                        No users found. Run{' '}
                        <code className='font-mono'>npm run db:seed</code> first.
                    </p>
                ) : (
                    <div className='flex flex-col gap-3 w-full'>
                        {users.map((u) => (
                            <form
                                key={u.id}
                                action='/api/dev-login'
                                method='post'
                                className='w-full'>
                                <input
                                    type='hidden'
                                    name='email'
                                    value={u.email ?? ''}
                                />
                                <Button
                                    type='submit'
                                    variant='outline'
                                    disabled={!u.email}
                                    className='w-full flex items-center justify-between gap-3'>
                                    <span className='font-medium'>
                                        {u.name ?? u.email ?? u.id}
                                    </span>
                                    <span className='text-xs rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-gray-600 dark:text-gray-300'>
                                        {u.role}
                                    </span>
                                </Button>
                            </form>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

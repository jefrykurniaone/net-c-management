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
        <div className='min-h-screen flex items-center justify-center bg-muted'>
            <div className='bg-card rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-6'>
                <div className='flex flex-col items-center gap-1 text-center'>
                    <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                        Development only
                    </span>
                    <h1 className='text-2xl font-bold text-foreground'>
                        Dev Login
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Bypasses Google OAuth. Pick a user to sign in as.
                    </p>
                </div>

                <div className='w-full border-t border-border' />

                {users.length === 0 ? (
                    <p className='text-sm text-muted-foreground text-center'>
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
                                    <span className='text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground'>
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

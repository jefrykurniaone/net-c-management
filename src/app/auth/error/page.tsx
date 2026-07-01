import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function AuthErrorPage() {
    const locale = await getLocale();
    const t = getDictionary(locale);

    return (
        <div className='min-h-screen flex items-center justify-center bg-muted'>
            <div className='bg-card rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-4'>
                <div className='w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center'>
                    <span className='text-destructive text-xl font-bold'>
                        !
                    </span>
                </div>
                <h1 className='text-xl font-bold text-foreground'>
                    {t.auth.errorTitle}
                </h1>
                <p className='text-sm text-muted-foreground text-center'>
                    {t.auth.errorMessage}
                </p>
                <a
                    href='/auth/signin'
                    className='text-sm text-primary hover:underline font-medium'>
                    {t.auth.backToSignIn}
                </a>
            </div>
        </div>
    );
}

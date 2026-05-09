import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function AuthErrorPage() {
    const locale = await getLocale();
    const t = getDictionary(locale);

    return (
        <div className='min-h-screen flex items-center justify-center bg-linear-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800'>
            <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-4'>
                <div className='w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center'>
                    <span className='text-red-600 dark:text-red-400 text-xl font-bold'>
                        !
                    </span>
                </div>
                <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
                    {t.auth.errorTitle}
                </h1>
                <p className='text-sm text-gray-500 dark:text-gray-400 text-center'>
                    {t.auth.errorMessage}
                </p>
                <a
                    href='/auth/signin'
                    className='text-sm text-green-600 hover:underline font-medium'>
                    {t.auth.backToSignIn}
                </a>
            </div>
        </div>
    );
}

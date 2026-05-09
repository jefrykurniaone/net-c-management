'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    buildOnboardingSchema,
    type OnboardingFormData,
} from '@/lib/validations/user';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default function OnboardingPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [communityName, setCommunityName] = useState('PB Net-C');
    const { locale } = useLocale();
    const t = getDictionary(locale);

    useEffect(() => {
        fetch('/api/settings')
            .then((r) => r.json())
            .then((data: { communityName?: string }) => {
                if (data.communityName) setCommunityName(data.communityName);
            })
            .catch(() => undefined);
    }, []);

    const form = useForm<OnboardingFormData>({
        resolver: zodResolver(buildOnboardingSchema(t)),
        defaultValues: {
            name: '',
            phone: '',
        },
    });

    async function onSubmit(data: OnboardingFormData) {
        setIsLoading(true);
        try {
            const res = await fetch('/api/users/onboarding', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || t.common.error);
            }

            toast.success(t.profile.toastSuccess);
            router.push('/dashboard');
            router.refresh();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : t.common.error,
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 px-4'>
            <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md'>
                <div className='flex flex-col items-center gap-2 mb-6'>
                    <div className='w-12 h-12 bg-green-600 rounded-full flex items-center justify-center'>
                        <span className='text-white font-bold text-xl'>PB</span>
                    </div>
                    <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                        {t.onboarding.title}
                    </h1>
                    <p className='text-sm text-gray-500 dark:text-gray-400 text-center'>
                        {t.onboarding.welcome} {communityName}
                        {t.onboarding.welcomeSuffix} {t.onboarding.subtitle}
                    </p>
                </div>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className='space-y-4'>
                        <FormField
                            control={form.control}
                            name='name'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.onboarding.name}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t.onboarding.namePlaceholder}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name='phone'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.onboarding.phone}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t.onboarding.phonePlaceholder}
                                            type='tel'
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name='playPosition'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.onboarding.position}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t.onboarding.positionPlaceholder} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value='SINGLE'>{t.positions.SINGLE}</SelectItem>
                                            <SelectItem value='DOUBLE'>{t.positions.DOUBLE}</SelectItem>
                                            <SelectItem value='BOTH'>{t.positions.BOTH}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name='playerLevel'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.onboarding.level}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t.onboarding.levelPlaceholder} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value='BEGINNER'>{t.levels.BEGINNER}</SelectItem>
                                            <SelectItem value='INTERMEDIATE'>{t.levels.INTERMEDIATE}</SelectItem>
                                            <SelectItem value='ADVANCED'>{t.levels.ADVANCED}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type='submit'
                            className='w-full'
                            disabled={isLoading}>
                            {isLoading ? t.onboarding.submitting : t.onboarding.submit}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}

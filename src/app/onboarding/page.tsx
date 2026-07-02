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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { communityAbbr } from '@/lib/utils';
import type { EkskulOption } from '@/types/ekskul';

export default function OnboardingPage() {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [isLoading, setIsLoading] = useState(false);
    const [communityName, setCommunityName] = useState(
        t.brand.defaultCommunityName,
    );
    const [ekskuls, setEkskuls] = useState<EkskulOption[]>([]);

    useEffect(() => {
        fetch('/api/settings')
            .then((r) => r.json())
            .then((data: { communityName?: string }) => {
                if (data.communityName) setCommunityName(data.communityName);
            })
            .catch((err) => {
                console.error('[Onboarding] fetchSettings:', err);
                return undefined;
            });
        fetch('/api/ekskul')
            .then((r) => r.json())
            .then((data: { ekskuls?: EkskulOption[] }) =>
                setEkskuls(data.ekskuls ?? []),
            )
            .catch(() => setEkskuls([]));
    }, []);

    const form = useForm<OnboardingFormData>({
        resolver: zodResolver(buildOnboardingSchema(t)),
        defaultValues: {
            name: '',
            phone: '',
            ekskulIds: [],
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
        <div className='min-h-screen flex items-center justify-center bg-muted px-4'>
            <div className='bg-card rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md'>
                <div className='flex flex-col items-center gap-2 mb-6'>
                    <div className='w-12 h-12 bg-muted rounded-full flex items-center justify-center'>
                        <span className='text-primary font-bold text-xl'>
                            {communityAbbr(communityName)}
                        </span>
                    </div>
                    <h1 className='text-2xl font-bold text-foreground'>
                        {t.onboarding.title}
                    </h1>
                    <p className='text-sm text-muted-foreground text-center'>
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
                                    <FormDescription>
                                        {t.common.phoneCountryCodeHint}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name='ekskulIds'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t.onboarding.ekskulLabel}
                                    </FormLabel>
                                    <div className='flex flex-wrap gap-2'>
                                        {ekskuls.map((e) => {
                                            const selected =
                                                field.value?.includes(e.id) ??
                                                false;
                                            return (
                                                <button
                                                    type='button'
                                                    key={e.id}
                                                    onClick={() =>
                                                        field.onChange(
                                                            selected
                                                                ? field.value.filter(
                                                                      (x) =>
                                                                          x !==
                                                                          e.id,
                                                                  )
                                                                : [
                                                                      ...(field.value ??
                                                                          []),
                                                                      e.id,
                                                                  ],
                                                        )
                                                    }
                                                    className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                                                        selected
                                                            ? 'border-transparent text-white'
                                                            : 'border-border text-muted-foreground hover:bg-muted'
                                                    }`}
                                                    style={
                                                        selected
                                                            ? {
                                                                  backgroundColor:
                                                                      e.color,
                                                              }
                                                            : undefined
                                                    }>
                                                    {e.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className='text-xs text-muted-foreground'>
                                        {t.onboarding.ekskulHint}
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type='submit'
                            className='w-full'
                            loading={isLoading}>
                            {t.onboarding.submit}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}

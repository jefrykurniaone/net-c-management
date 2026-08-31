'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    buildOnboardingSchema,
    type OnboardingFormData,
} from '@/lib/validations/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { ThresholdRail } from '@/components/layout/threshold-rail';
import { TASK_MEASURE } from '@/components/layout/measure';
import { cn } from '@/lib/utils';
import type { ActivityOption } from '@/types/activity';
import { ActivityField } from './activity-field';
import {
    FieldErrorMessage,
    NAME_ERROR_KEYS,
    PHONE_ERROR_KEYS,
} from './field-error-message';

/**
 * The onboarding form, brought onto the board (issue 55).
 *
 * Signing in is signing up: Google login auto-creates the account, and this
 * is the first real screen most members ever see. It is one task — complete
 * your profile — so it takes the 40rem single-task column DESIGN.md gives
 * every such form (Proof upload, sign-in, an Applicant's waiting page), top-
 * anchored under the identity rail like any other board surface rather than
 * vertically centred, since a multi-field form is not the two-affordance
 * interstitial that reservation is for.
 *
 * What it collects and where it redirects on completion are unchanged: the
 * same three fields, POSTed to the same `/api/users/onboarding`, landing on
 * `/dashboard`. Only the treatment — container, field, and error copy — is
 * new.
 */

function useOnboardingContext(t: Dictionary) {
    const [communityName, setCommunityName] = useState(
        t.brand.defaultCommunityName,
    );
    const [logoUrl, setLogoUrl] = useState('');
    const [activities, setActivities] = useState<ActivityOption[]>([]);

    useEffect(() => {
        fetch('/api/settings')
            .then((r) => r.json())
            .then((data: { communityName?: string; logoUrl?: string }) => {
                if (data.communityName) setCommunityName(data.communityName);
                if (data.logoUrl) setLogoUrl(data.logoUrl);
            })
            .catch((err) => {
                console.error('[Onboarding] fetchSettings:', err);
            });
        fetch('/api/activities')
            .then((r) => r.json())
            .then((data: { activities?: ActivityOption[] }) =>
                setActivities(data.activities ?? []),
            )
            .catch(() => setActivities([]));
    }, []);

    return { communityName, logoUrl, activities };
}

export default function OnboardingPage() {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [isLoading, setIsLoading] = useState(false);
    const { communityName, logoUrl, activities } = useOnboardingContext(t);

    const form = useForm<OnboardingFormData>({
        resolver: zodResolver(buildOnboardingSchema(t)),
        defaultValues: {
            name: '',
            phone: '',
            activityIds: [],
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
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className='flex min-h-screen flex-col bg-background'>
            <ThresholdRail communityName={communityName} logoUrl={logoUrl} />
            <main className='flex flex-1 justify-center px-block py-bay'>
                <div className={cn(TASK_MEASURE, 'flex flex-col gap-block')}>
                    <div className='flex flex-col gap-cell'>
                        <h1 className='type-display text-foreground'>
                            {t.onboarding.title}
                        </h1>
                        <p className='type-body text-secondary-foreground'>
                            {t.onboarding.welcome} {communityName}
                            {t.onboarding.welcomeSuffix} {t.onboarding.subtitle}
                        </p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <Card>
                                <CardContent className='flex flex-col gap-block'>
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
                                                <FieldErrorMessage
                                                    t={t}
                                                    keyMap={NAME_ERROR_KEYS}
                                                />
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
                                                <FieldErrorMessage
                                                    t={t}
                                                    keyMap={PHONE_ERROR_KEYS}
                                                />
                                            </FormItem>
                                        )}
                                    />

                                    <ActivityField
                                        control={form.control}
                                        activities={activities}
                                        t={t}
                                    />

                                    <Button
                                        type='submit'
                                        className='w-full'
                                        loading={isLoading}>
                                        {t.onboarding.submit}
                                    </Button>
                                </CardContent>
                            </Card>
                        </form>
                    </Form>
                </div>
            </main>
        </div>
    );
}

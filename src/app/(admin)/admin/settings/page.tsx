'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { FormSkeleton } from '@/components/skeletons/page-skeletons';
import { PhonePicker } from '@/components/admin/phone-picker';
import { HoldDurationField } from '@/components/admin/hold-duration-field';

const DEFAULT_HOLD_DURATION_MINUTES = '60';

interface SettingsMap {
    communityName?: string;
    defaultLocation?: string;
    adminWhatsapp?: string;
    logoUrl?: string;
    holdDurationMinutes?: string;
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [settings, setSettings] = useState<SettingsMap>({
        communityName: t.brand.defaultCommunityName,
        defaultLocation: '',
        adminWhatsapp: '',
        logoUrl: '',
        holdDurationMinutes: DEFAULT_HOLD_DURATION_MINUTES,
    });

    useEffect(() => {
        async function loadSettings() {
            setLoading(true);
            try {
                const r = await fetch('/api/settings');
                const data: SettingsMap = await r.json();
                setSettings((prev) => ({ ...prev, ...data }));
            } finally {
                setLoading(false);
            }
        }
        void loadSettings();
    }, []);

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setLogoPreview(URL.createObjectURL(file));
        setUploadingLogo(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await fetch('/api/settings/logo', {
                method: 'POST',
                body: form,
            });
            if (!res.ok) {
                const data = (await res.json()) as { error?: string };
                throw new Error(data.error ?? t.admin.logoFail);
            }
            const data = (await res.json()) as { logoUrl: string };
            setSettings((prev) => ({ ...prev, logoUrl: data.logoUrl }));
            toast.success(t.admin.logoSuccess);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.admin.logoFail);
            setLogoPreview(null);
        } finally {
            setUploadingLogo(false);
            if (logoInputRef.current) logoInputRef.current.value = '';
        }
    }

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error(t.admin.settingsFailed);
            toast.success(t.admin.settingsSaved);
            router.refresh();
        } catch {
            toast.error(t.common.error);
        } finally {
            setSaving(false);
        }
    }

    function update(key: keyof SettingsMap, value: string) {
        setSettings((prev) => ({ ...prev, [key]: value }));
    }

    function logoButtonLabel(): string {
        if (settings.logoUrl) return t.admin.logoChange;
        return t.admin.logoUpload;
    }

    if (loading) {
        return <FormSkeleton fields={5} />;
    }

    return (
        <div className='max-w-lg space-y-6'>
            <div>
                <h1 className='text-2xl font-bold text-foreground'>
                    {t.admin.settingsTitle}
                </h1>
                <p className='text-sm text-muted-foreground mt-1'>
                    {t.admin.settingsSubtitle}{' '}
                    {settings.communityName ?? t.brand.defaultCommunityName}
                </p>
            </div>

            <div className='bg-card rounded-xl border border-border p-6 space-y-5'>
                {/* Logo upload */}
                <div className='space-y-3'>
                    <Label>{t.admin.logoLabel}</Label>
                    <div className='flex items-center gap-4'>
                        {(logoPreview ?? settings.logoUrl) ? (
                            <Image
                                src={
                                    (logoPreview ?? settings.logoUrl) as string
                                }
                            alt={t.admin.logoLabel}
                                width={64}
                                height={64}
                                className='w-16 h-16 rounded-full object-cover border border-border'
                            />
                        ) : (
                            <div className='w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-border'>
                                <Upload className='w-6 h-6 text-primary' />
                            </div>
                        )}
                        <div className='space-y-1'>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                loading={uploadingLogo}
                                onClick={() => logoInputRef.current?.click()}>
                                {logoButtonLabel()}
                            </Button>
                            <p className='text-xs text-muted-foreground'>
                                {t.admin.logoHint}
                            </p>
                        </div>
                    </div>
                    <input
                        ref={logoInputRef}
                        type='file'
                        accept='image/jpeg,image/png,image/webp'
                        className='hidden'
                        onChange={handleLogoUpload}
                    />
                </div>
            </div>

            <div className='bg-card rounded-xl border border-border p-6'>
                <form onSubmit={handleSubmit} className='space-y-5'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='communityName'>
                            {t.admin.communityNameLabel}
                        </Label>
                        <Input
                            id='communityName'
                            value={settings.communityName ?? ''}
                            onChange={(e) =>
                                update('communityName', e.target.value)
                            }
                        />
                    </div>

                    <div className='space-y-1.5'>
                        <Label htmlFor='defaultLocation'>
                            {t.admin.defaultLocationLabel}
                        </Label>
                        <Input
                            id='defaultLocation'
                            placeholder={t.admin.defaultLocationPlaceholder}
                            value={settings.defaultLocation ?? ''}
                            onChange={(e) =>
                                update('defaultLocation', e.target.value)
                            }
                        />
                    </div>

                    <div className='space-y-1.5'>
                        <Label htmlFor='adminWhatsapp'>
                            {t.admin.adminWhatsappLabel}
                        </Label>
                        <Input
                            id='adminWhatsapp'
                            placeholder='6281234567890'
                            value={settings.adminWhatsapp ?? ''}
                            onChange={(e) =>
                                update('adminWhatsapp', e.target.value)
                            }
                        />
                        <p className='text-xs text-muted-foreground'>
                            {t.admin.whatsappHint}
                        </p>
                        <PhonePicker
                            onPick={(phone) => update('adminWhatsapp', phone)}
                        />
                    </div>

                    <HoldDurationField
                        value={
                            settings.holdDurationMinutes ??
                            DEFAULT_HOLD_DURATION_MINUTES
                        }
                        onChange={(minutes) =>
                            update('holdDurationMinutes', minutes)
                        }
                    />

                    <Button
                        type='submit'
                        className='w-full'
                        loading={saving}>
                        {t.admin.saveSettings}
                    </Button>
                </form>
            </div>
        </div>
    );
}

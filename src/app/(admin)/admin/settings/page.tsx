'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, Upload } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface SettingsMap {
    communityName?: string;
    defaultMonthlyFee?: string;
    defaultLocation?: string;
    adminWhatsapp?: string;
    maxPlayers?: string;
    logoUrl?: string;
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
        communityName: 'PB Net-C',
        defaultMonthlyFee: '50000',
        defaultLocation: '',
        adminWhatsapp: '',
        maxPlayers: '20',
        logoUrl: '',
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
        if (uploadingLogo) return t.admin.logoUploading;
        if (settings.logoUrl) return t.admin.logoChange;
        return t.admin.logoUpload;
    }

    if (loading) {
        return (
            <div className='text-gray-400 text-sm'>
                {t.common.loadingSettings}
            </div>
        );
    }

    return (
        <div className='max-w-lg space-y-6'>
            <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                    <Settings className='w-6 h-6 text-green-600' />
                    {t.admin.settingsTitle}
                </h1>
                <p className='text-sm text-gray-500 mt-1'>
                    {t.admin.settingsSubtitle}{' '}
                    {settings.communityName ?? 'PB Net-C'}
                </p>
            </div>

            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6 space-y-5'>
                {/* Logo upload */}
                <div className='space-y-3'>
                    <Label>{t.admin.logoLabel}</Label>
                    <div className='flex items-center gap-4'>
                        {(logoPreview ?? settings.logoUrl) ? (
                            <Image
                                src={
                                    (logoPreview ?? settings.logoUrl) as string
                                }
                                alt='logo'
                                width={64}
                                height={64}
                                className='w-16 h-16 rounded-full object-cover border border-gray-200'
                            />
                        ) : (
                            <div className='w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border border-gray-200'>
                                <Upload className='w-6 h-6 text-green-600' />
                            </div>
                        )}
                        <div className='space-y-1'>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                disabled={uploadingLogo}
                                onClick={() => logoInputRef.current?.click()}>
                                {logoButtonLabel()}
                            </Button>
                            <p className='text-xs text-gray-400'>
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

            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6'>
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
                        <Label htmlFor='defaultMonthlyFee'>
                            {t.admin.defaultFeeLabel}
                        </Label>
                        <Input
                            id='defaultMonthlyFee'
                            type='number'
                            min={0}
                            value={settings.defaultMonthlyFee ?? ''}
                            onChange={(e) =>
                                update('defaultMonthlyFee', e.target.value)
                            }
                        />
                    </div>

                    <div className='space-y-1.5'>
                        <Label htmlFor='defaultLocation'>
                            {t.admin.defaultLocationLabel}
                        </Label>
                        <Input
                            id='defaultLocation'
                            placeholder={
                                locale === 'id'
                                    ? 'Contoh: GOR Serbaguna Kelurahan X'
                                    : 'e.g. Community Sports Hall'
                            }
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
                        <p className='text-xs text-gray-400'>
                            {t.admin.whatsappHint}
                        </p>
                    </div>

                    <div className='space-y-1.5'>
                        <Label htmlFor='maxPlayers'>
                            {t.admin.maxPlayersLabel}
                        </Label>
                        <Input
                            id='maxPlayers'
                            type='number'
                            min={2}
                            value={settings.maxPlayers ?? ''}
                            onChange={(e) =>
                                update('maxPlayers', e.target.value)
                            }
                        />
                    </div>

                    <Button
                        type='submit'
                        className='w-full bg-green-600 hover:bg-green-700 text-white'
                        disabled={saving}>
                        {saving ? t.admin.saving : t.admin.saveSettings}
                    </Button>
                </form>
            </div>
        </div>
    );
}

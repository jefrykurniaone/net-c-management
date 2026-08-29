import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const DEFAULT_HOLD_DURATION_MINUTES = '60';

export interface SettingsMap {
    communityName?: string;
    defaultLocation?: string;
    adminWhatsapp?: string;
    logoUrl?: string;
    holdDurationMinutes?: string;
}

/**
 * All state and network calls for the Settings page — loading, saving, the
 * logo upload and its preview. The page component stays presentation-only;
 * saving behaviour, validation and the `/api/settings*` calls are unchanged
 * from before this ticket.
 */
export function useSettingsForm() {
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
        if (!settings.communityName?.trim()) {
            toast.error(t.validation.communityNameRequired);
            return;
        }
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

    return {
        t,
        loading,
        saving,
        uploadingLogo,
        logoPreview,
        logoInputRef,
        settings,
        handleLogoUpload,
        handleSubmit,
        update,
        logoButtonLabel,
    };
}

import { useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import {
    checkPublicCopyPatch,
    publicCopyRefusalMessage,
    type StoredPublicCopy,
} from '@/lib/public-copy';
import { useHeroImageUpload } from './use-hero-image-upload';

export const DEFAULT_HOLD_DURATION_MINUTES = '60';

/**
 * Extends the public-copy keys rather than restating them (#153): the key list
 * lives in `src/lib/public-copy.ts` beside the caps, so a field added there is
 * a field this form can already hold.
 */
export interface SettingsMap extends StoredPublicCopy {
    communityName?: string;
    defaultLocation?: string;
    adminWhatsapp?: string;
    logoUrl?: string;
    heroImageUrl?: string;
    holdDurationMinutes?: string;
}

export type AppRouter = ReturnType<typeof useRouter>;
export type SetSettings = Dispatch<SetStateAction<SettingsMap>>;

function initialSettings(t: Dictionary): SettingsMap {
    return {
        communityName: t.brand.defaultCommunityName,
        defaultLocation: '',
        adminWhatsapp: '',
        logoUrl: '',
        heroImageUrl: '',
        holdDurationMinutes: DEFAULT_HOLD_DURATION_MINUTES,
    };
}

/** Fetches `/api/settings` once on mount into local state. */
function useSettingsLoad(t: Dictionary) {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<SettingsMap>(() =>
        initialSettings(t),
    );

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

    return { loading, settings, setSettings };
}

/** `POST /api/settings/logo`, unchanged request shape and error handling. */
async function postLogo(file: File, fallbackError: string): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? fallbackError);
    }
    const data = (await res.json()) as { logoUrl: string };
    return data.logoUrl;
}

interface LogoUploadDeps {
    t: Dictionary;
    router: AppRouter;
    setSettings: SetSettings;
    setUploadingLogo: (value: boolean) => void;
    setLogoPreview: (value: string | null) => void;
    logoInputRef: RefObject<HTMLInputElement | null>;
}

/** The upload-then-refresh sequence, unchanged, run for one picked file. */
async function runLogoUpload(
    file: File,
    deps: Readonly<LogoUploadDeps>,
): Promise<void> {
    const { t, router, setSettings, setUploadingLogo, setLogoPreview } = deps;
    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
        const logoUrl = await postLogo(file, t.admin.logoFail);
        setSettings((prev) => ({ ...prev, logoUrl }));
        toast.success(t.admin.logoSuccess);
        router.refresh();
    } catch (err) {
        toast.error(err instanceof Error ? err.message : t.admin.logoFail);
        setLogoPreview(null);
    } finally {
        setUploadingLogo(false);
        if (deps.logoInputRef.current) {
            deps.logoInputRef.current.value = '';
        }
    }
}

/** The logo upload flow: preview, `runLogoUpload`, unchanged. */
function useLogoUpload({
    t,
    router,
    setSettings,
}: Readonly<{ t: Dictionary; router: AppRouter; setSettings: SetSettings }>) {
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        void runLogoUpload(file, {
            t,
            router,
            setSettings,
            setUploadingLogo,
            setLogoPreview,
            logoInputRef,
        });
    }

    function logoButtonLabel(logoUrl?: string): string {
        return logoUrl ? t.admin.logoChange : t.admin.logoUpload;
    }

    return {
        uploadingLogo,
        logoPreview,
        logoInputRef,
        handleLogoUpload,
        logoButtonLabel,
    };
}

/** Save: `PATCH /api/settings`. Two refusals before the request goes out — the
 *  community name, and the public copy's caps (#153) — then the same payload. */
function useSettingsSave({
    t,
    router,
    settings,
}: Readonly<{ t: Dictionary; router: AppRouter; settings: SettingsMap }>) {
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        if (!settings.communityName?.trim()) {
            toast.error(t.validation.communityNameRequired);
            return;
        }
        // The same check the API makes, from the same constants, so the form
        // never sends a body it knows will be refused (#153). The counter under
        // each field has already said which one it is.
        const refusal = checkPublicCopyPatch(settings);
        if (refusal) {
            toast.error(publicCopyRefusalMessage(refusal, t));
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) {
                throw new Error(t.admin.settingsFailed);
            }
            toast.success(t.admin.settingsSaved);
            router.refresh();
        } catch {
            toast.error(t.common.error);
        } finally {
            setSaving(false);
        }
    }

    return { saving, handleSubmit };
}

/**
 * All state and network calls for the Settings page — loading, saving, the
 * logo upload and its preview, and (#155) the hero-image upload/remove pair
 * from `use-hero-image-upload.ts`. The page component stays
 * presentation-only; saving behaviour, validation and the `/api/settings*`
 * calls are unchanged from before this ticket. Composes the hooks above, one
 * per concern.
 */
export function useSettingsForm() {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const { loading, settings, setSettings } = useSettingsLoad(t);
    const {
        uploadingLogo,
        logoPreview,
        logoInputRef,
        handleLogoUpload,
        logoButtonLabel,
    } = useLogoUpload({ t, router, setSettings });
    const {
        uploadingHeroImage,
        removingHeroImage,
        heroImagePreview,
        heroImageInputRef,
        handleHeroImageUpload,
        handleHeroImageRemove,
        heroImageButtonLabel,
    } = useHeroImageUpload({ t, router, setSettings });
    const { saving, handleSubmit } = useSettingsSave({ t, router, settings });

    function update(key: keyof SettingsMap, value: string) {
        setSettings((prev) => ({ ...prev, [key]: value }));
    }

    return {
        t,
        loading,
        saving,
        uploadingLogo,
        logoPreview,
        logoInputRef,
        uploadingHeroImage,
        removingHeroImage,
        heroImagePreview,
        heroImageInputRef,
        settings,
        handleLogoUpload,
        handleHeroImageUpload,
        handleHeroImageRemove,
        handleSubmit,
        update,
        logoButtonLabel: () => logoButtonLabel(settings.logoUrl),
        heroImageButtonLabel: () => heroImageButtonLabel(settings.heroImageUrl),
    };
}

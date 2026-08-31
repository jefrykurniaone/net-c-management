import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { toast } from 'sonner';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { AppRouter, SetSettings } from './use-settings-form';

/**
 * The public page's hero photograph: upload, remove and their preview state
 * (#155). Split out of `use-settings-form.ts` to keep that file under the
 * 300-line cap — the same reason the logo pair stayed inline while this one,
 * with a remove action on top, did not.
 *
 * `POST` / `DELETE /api/settings/hero-image`, same request shape and error
 * handling as `use-settings-form.ts`'s logo pair.
 */
async function postHeroImage(file: File, fallbackError: string): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/settings/hero-image', {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? fallbackError);
    }
    const data = (await res.json()) as { heroImageUrl: string };
    return data.heroImageUrl;
}

async function removeHeroImage(fallbackError: string): Promise<void> {
    const res = await fetch('/api/settings/hero-image', { method: 'DELETE' });
    if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? fallbackError);
    }
}

interface HeroImageUploadDeps {
    t: Dictionary;
    router: AppRouter;
    setSettings: SetSettings;
    setUploadingHeroImage: (value: boolean) => void;
    setHeroImagePreview: (value: string | null) => void;
    heroImageInputRef: RefObject<HTMLInputElement | null>;
}

/** The upload-then-refresh sequence, one picked file, mirroring the logo
 *  pair's `runLogoUpload`. */
async function runHeroImageUpload(
    file: File,
    deps: Readonly<HeroImageUploadDeps>,
): Promise<void> {
    const { t, router, setSettings, setUploadingHeroImage, setHeroImagePreview } =
        deps;
    setHeroImagePreview(URL.createObjectURL(file));
    setUploadingHeroImage(true);
    try {
        const heroImageUrl = await postHeroImage(file, t.publicCopy.heroImageUploadFail);
        setSettings((prev) => ({ ...prev, heroImageUrl }));
        toast.success(t.publicCopy.heroImageUploadSuccess);
        router.refresh();
    } catch (err) {
        toast.error(
            err instanceof Error ? err.message : t.publicCopy.heroImageUploadFail,
        );
        setHeroImagePreview(null);
    } finally {
        setUploadingHeroImage(false);
        if (deps.heroImageInputRef.current) {
            deps.heroImageInputRef.current.value = '';
        }
    }
}

/** The hero-image upload and remove flow: preview, `runHeroImageUpload`, and
 *  the remove action that clears both the local preview and the stored key. */
export function useHeroImageUpload({
    t,
    router,
    setSettings,
}: Readonly<{ t: Dictionary; router: AppRouter; setSettings: SetSettings }>) {
    const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
    const [removingHeroImage, setRemovingHeroImage] = useState(false);
    const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
    const heroImageInputRef = useRef<HTMLInputElement>(null);

    function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        void runHeroImageUpload(file, {
            t,
            router,
            setSettings,
            setUploadingHeroImage,
            setHeroImagePreview,
            heroImageInputRef,
        });
    }

    async function handleHeroImageRemove(): Promise<void> {
        setRemovingHeroImage(true);
        try {
            await removeHeroImage(t.publicCopy.heroImageRemoveFail);
            setSettings((prev) => ({ ...prev, heroImageUrl: '' }));
            setHeroImagePreview(null);
            toast.success(t.publicCopy.heroImageRemoveSuccess);
            router.refresh();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : t.publicCopy.heroImageRemoveFail,
            );
        } finally {
            setRemovingHeroImage(false);
        }
    }

    function heroImageButtonLabel(heroImageUrl?: string): string {
        return heroImageUrl
            ? t.publicCopy.heroImageChange
            : t.publicCopy.heroImageUpload;
    }

    return {
        uploadingHeroImage,
        removingHeroImage,
        heroImagePreview,
        heroImageInputRef,
        handleHeroImageUpload,
        handleHeroImageRemove,
        heroImageButtonLabel,
    };
}

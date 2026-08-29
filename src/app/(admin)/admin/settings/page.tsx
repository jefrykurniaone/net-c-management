'use client';

import type { Dictionary } from '@/lib/i18n/dictionaries';
import { FormSkeleton } from '@/components/skeletons/page-skeletons';
import { SettingsForm } from './settings-form';
import { DEFAULT_HOLD_DURATION_MINUTES, useSettingsForm } from './use-settings-form';

function SettingsHeading({
    t,
    communityName,
}: Readonly<{ t: Dictionary; communityName: string }>) {
    return (
        <div>
            <h1 className='type-display text-foreground'>
                {t.admin.settingsTitle}
            </h1>
            <p className='mt-cell type-caption text-muted-foreground'>
                {t.admin.settingsSubtitle} {communityName}
            </p>
        </div>
    );
}

export default function AdminSettingsPage() {
    const {
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
    } = useSettingsForm();

    if (loading) {
        return <FormSkeleton fields={5} />;
    }

    return (
        <div className='space-y-bay'>
            <SettingsHeading
                t={t}
                communityName={
                    settings.communityName?.trim() || t.brand.defaultCommunityName
                }
            />
            <SettingsForm
                t={t}
                settings={settings}
                saving={saving}
                update={update}
                onSubmit={handleSubmit}
                defaultHoldDurationMinutes={DEFAULT_HOLD_DURATION_MINUTES}
                logoProps={{
                    logoSrc: logoPreview ?? settings.logoUrl ?? null,
                    uploadingLogo,
                    logoButtonLabel: logoButtonLabel(),
                    logoInputRef,
                    onUploadClick: () => logoInputRef.current?.click(),
                    onLogoChange: handleLogoUpload,
                }}
            />
        </div>
    );
}

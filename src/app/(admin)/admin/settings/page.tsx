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

type LogoDeps = Pick<
    ReturnType<typeof useSettingsForm>,
    | 'logoPreview'
    | 'uploadingLogo'
    | 'logoButtonLabel'
    | 'logoInputRef'
    | 'handleLogoUpload'
> & { logoUrl?: string };

/** Assembles `SettingsForm`'s `logoProps` from the hook's return values. */
function buildLogoProps({
    logoPreview,
    logoUrl,
    uploadingLogo,
    logoButtonLabel,
    logoInputRef,
    handleLogoUpload,
}: Readonly<LogoDeps>) {
    return {
        logoSrc: logoPreview ?? logoUrl ?? null,
        uploadingLogo,
        logoButtonLabel: logoButtonLabel(),
        logoInputRef,
        onUploadClick: () => logoInputRef.current?.click(),
        onLogoChange: handleLogoUpload,
    };
}

export default function AdminSettingsPage() {
    const form = useSettingsForm();

    if (form.loading) {
        return <FormSkeleton fields={5} />;
    }

    return <SettingsPageBody form={form} />;
}

/** The loaded page body, split out to keep `AdminSettingsPage` short. */
function SettingsPageBody({
    form,
}: Readonly<{ form: ReturnType<typeof useSettingsForm> }>) {
    const { t, settings, saving, update, handleSubmit } = form;
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
                logoProps={buildLogoProps({
                    logoPreview: form.logoPreview,
                    logoUrl: settings.logoUrl,
                    uploadingLogo: form.uploadingLogo,
                    logoButtonLabel: form.logoButtonLabel,
                    logoInputRef: form.logoInputRef,
                    handleLogoUpload: form.handleLogoUpload,
                })}
            />
        </div>
    );
}

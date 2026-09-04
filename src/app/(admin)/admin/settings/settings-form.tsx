import Image from 'next/image';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { PhonePicker } from '@/components/admin/phone-picker';
import { HoldDurationField } from '@/components/admin/hold-duration-field';
import { SettingsSection } from '@/components/admin/settings-sections';
import { SettingsRow, settingsHelperId } from '@/components/admin/settings-rows';
import { PublicCopySection } from './public-copy-section';
import type { HeroImageProps } from './hero-image-control';
import type { SettingsMap } from './use-settings-form';

/**
 * The Settings page's body — one card per section, one row per setting.
 * Presentation only: every value, handler and validation rule comes from
 * `useSettingsForm`.
 */

interface LogoControlProps {
    t: Dictionary;
    logoSrc: string | null;
    uploadingLogo: boolean;
    logoButtonLabel: string;
    logoInputRef: RefObject<HTMLInputElement | null>;
    onUploadClick: () => void;
    onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Props `LogoControl` takes minus `t`, which every section already has. */
type LogoProps = Omit<LogoControlProps, 't'>;

function LogoPlaceholder() {
    return (
        <div className='flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background'>
            <Upload className='h-6 w-6 text-muted-foreground' />
        </div>
    );
}

function LogoControl({
    t,
    logoSrc,
    uploadingLogo,
    logoButtonLabel,
    logoInputRef,
    onUploadClick,
    onLogoChange,
}: Readonly<LogoControlProps>) {
    return (
        <div className='flex items-center gap-block'>
            {logoSrc ? (
                <Image
                    src={logoSrc}
                    alt={t.admin.logoLabel}
                    width={64}
                    height={64}
                    className='h-16 w-16 rounded-full border border-border object-cover'
                />
            ) : (
                <LogoPlaceholder />
            )}
            <Button
                type='button'
                variant='outline'
                size='sm'
                loading={uploadingLogo}
                onClick={onUploadClick}>
                {logoButtonLabel}
            </Button>
            <input
                ref={logoInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp'
                className='hidden'
                onChange={onLogoChange}
            />
        </div>
    );
}

function BasicInfoSection({
    t,
    settings,
    update,
    logoProps,
}: Readonly<{
    t: Dictionary;
    settings: SettingsMap;
    update: (key: keyof SettingsMap, value: string) => void;
    logoProps: LogoProps;
}>) {
    return (
        <SettingsSection title={t.admin.sectionBasicInfo}>
            <SettingsRow id='communityName' label={t.admin.communityNameLabel}>
                <Input
                    id='communityName'
                    value={settings.communityName ?? ''}
                    onChange={(e) => update('communityName', e.target.value)}
                />
            </SettingsRow>
            <SettingsRow
                id='communityLogo'
                label={t.admin.logoLabel}
                helper={t.admin.logoHint}>
                <LogoControl t={t} {...logoProps} />
            </SettingsRow>
            <SettingsRow
                id='defaultLocation'
                label={t.admin.defaultLocationLabel}>
                <Input
                    id='defaultLocation'
                    placeholder={t.admin.defaultLocationPlaceholder}
                    value={settings.defaultLocation ?? ''}
                    onChange={(e) => update('defaultLocation', e.target.value)}
                />
            </SettingsRow>
        </SettingsSection>
    );
}

function ContactSection({
    t,
    settings,
    update,
}: Readonly<{
    t: Dictionary;
    settings: SettingsMap;
    update: (key: keyof SettingsMap, value: string) => void;
}>) {
    return (
        <SettingsSection title={t.admin.sectionContact}>
            <SettingsRow
                id='adminWhatsapp'
                label={t.admin.adminWhatsappLabel}
                helper={t.admin.whatsappHint}>
                <Input
                    id='adminWhatsapp'
                    placeholder='6281234567890'
                    aria-describedby={settingsHelperId('adminWhatsapp')}
                    value={settings.adminWhatsapp ?? ''}
                    onChange={(e) => update('adminWhatsapp', e.target.value)}
                />
                <PhonePicker onPick={(phone) => update('adminWhatsapp', phone)} />
            </SettingsRow>
        </SettingsSection>
    );
}

function PaymentSection({
    t,
    holdDurationMinutes,
    update,
}: Readonly<{
    t: Dictionary;
    holdDurationMinutes: string;
    update: (key: keyof SettingsMap, value: string) => void;
}>) {
    return (
        <SettingsSection title={t.admin.sectionPayment}>
            <SettingsRow
                id='holdDuration'
                label={t.admin.holdDurationLabel}
                helper={t.admin.holdDurationHint}>
                <HoldDurationField
                    value={holdDurationMinutes}
                    onChange={(minutes) =>
                        update('holdDurationMinutes', minutes)
                    }
                />
            </SettingsRow>
        </SettingsSection>
    );
}

export function SettingsForm({
    t,
    settings,
    saving,
    update,
    onSubmit,
    logoProps,
    heroImageProps,
    defaultHoldDurationMinutes,
}: Readonly<{
    t: Dictionary;
    settings: SettingsMap;
    saving: boolean;
    update: (key: keyof SettingsMap, value: string) => void;
    onSubmit: (e: React.SyntheticEvent) => void;
    logoProps: LogoProps;
    heroImageProps: HeroImageProps;
    defaultHoldDurationMinutes: string;
}>) {
    return (
        <form onSubmit={onSubmit}>
            <div className='space-y-bay'>
                <BasicInfoSection t={t} settings={settings} update={update} logoProps={logoProps} />
                <ContactSection t={t} settings={settings} update={update} />
                <PaymentSection
                    t={t}
                    holdDurationMinutes={settings.holdDurationMinutes ?? defaultHoldDurationMinutes}
                    update={update}
                />
                {/* A card of its own beside the three above rather than inside
                    one of them: nothing here configures how the community runs,
                    it is what a stranger reads. */}
                <PublicCopySection
                    t={t}
                    settings={settings}
                    update={update}
                    heroImageProps={heroImageProps}
                />
            </div>
            {/* The action reads as one more card in the stack rather than a
                loose control under it: same ground and lift as the sections
                above, the button centred on it. Full width only where the
                thumb reaches for it; from `sm` up it sizes to its own label. */}
            <div className='mt-bay flex justify-center rounded-xl bg-card p-block shadow-lift'>
                <Button type='submit' className='w-full sm:w-auto' loading={saving}>
                    {t.admin.saveSettings}
                </Button>
            </div>
        </form>
    );
}

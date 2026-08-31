import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { SettingsSection } from '@/components/admin/settings-sections';
import { SettingsRow, settingsHelperId } from '@/components/admin/settings-rows';
import {
    PUBLIC_FEATURE_SLOTS,
    checkPublicCopyValue,
    publicCopyCap,
    publicCopyRefusalMessage,
    type PublicCopyKey,
    type PublicCopyRefusal,
    type PublicFeatureSlot,
} from '@/lib/public-copy';
import type { SettingsMap } from './use-settings-form';

/**
 * The Settings section where an Admin writes what the public page says (#153).
 *
 * Additive: it composes the same `SettingsSection` / `SettingsRow` pair the
 * three sections beside it use, and changes none of them. #167 restyles the
 * whole form and #155 adds the hero image control to this section.
 *
 * The caps come from `src/lib/public-copy.ts` and nowhere else, so the number
 * the counter counts against, the number in the refusal below a field, and the
 * number in the API's refusal are one constant. Over-cap text is not truncated
 * and typing is not blocked — a `maxLength` swallows a paste silently and
 * explains nothing — so the field says what the rule is and the form refuses to
 * save until it holds.
 */

/** Deep enough for the about paragraph to read as a paragraph before it grows. */
const ABOUT_ROWS = 5;

interface CopyFieldProps {
    t: Dictionary;
    settingKey: PublicCopyKey;
    label: string;
    helper?: string;
    value: string;
    isMultiline?: boolean;
    isLast?: boolean;
    onChange: (key: PublicCopyKey, value: string) => void;
}

/** The counter's id, which the control points `aria-describedby` at. */
function counterId(key: PublicCopyKey): string {
    return `${key}-counter`;
}

/**
 * The live counter and, when the value breaks a cap, the refusal that names it.
 *
 * Never colour alone: the counter is a fraction that reads `52 / 48` when it is
 * over, the refusal is a sentence, and the control carries `aria-invalid`. The
 * refusal's element is always mounted so `aria-live` has a region to announce
 * into — a region that appears at the same moment as its text announces
 * nothing.
 */
function CopyFieldNote({
    t,
    settingKey,
    value,
    refusal,
}: Readonly<{
    t: Dictionary;
    settingKey: PublicCopyKey;
    value: string;
    refusal: PublicCopyRefusal | null;
}>) {
    const cap = publicCopyCap(settingKey);
    const counter = t.publicCopy.counter
        .replace('{count}', String(value.length))
        .replace('{max}', String(cap));

    return (
        <div
            id={counterId(settingKey)}
            className='flex flex-wrap items-baseline gap-cell'>
            <span className='type-caption text-muted-foreground'>
                <span className='sr-only'>{t.publicCopy.counterLabel} </span>
                {counter}
            </span>
            <span aria-live='polite' className='type-body text-destructive'>
                {refusal ? publicCopyRefusalMessage(refusal, t) : ''}
            </span>
        </div>
    );
}

/** One ruled row: label, help text, the control, and the note beneath it. */
function CopyField({
    t,
    settingKey,
    label,
    helper,
    value,
    isMultiline = false,
    isLast = false,
    onChange,
}: Readonly<CopyFieldProps>) {
    const refusal = checkPublicCopyValue(settingKey, value);
    const describedBy = helper
        ? `${settingsHelperId(settingKey)} ${counterId(settingKey)}`
        : counterId(settingKey);
    const shared = {
        id: settingKey,
        value,
        'aria-invalid': refusal !== null,
        'aria-describedby': describedBy,
    };

    return (
        <SettingsRow
            id={settingKey}
            label={label}
            helper={helper}
            isLast={isLast}>
            {isMultiline ? (
                <Textarea
                    {...shared}
                    rows={ABOUT_ROWS}
                    onChange={(e) => onChange(settingKey, e.target.value)}
                />
            ) : (
                <Input
                    {...shared}
                    onChange={(e) => onChange(settingKey, e.target.value)}
                />
            )}
            <CopyFieldNote
                t={t}
                settingKey={settingKey}
                value={value}
                refusal={refusal}
            />
        </SettingsRow>
    );
}

interface FeatureSlotProps {
    t: Dictionary;
    slot: PublicFeatureSlot;
    settings: SettingsMap;
    isLast: boolean;
    onChange: (key: PublicCopyKey, value: string) => void;
}

/** One feature card: its title and its one line, as two rows. */
function FeatureSlotRows({
    t,
    slot,
    settings,
    isLast,
    onChange,
}: Readonly<FeatureSlotProps>) {
    const position = String(slot.position);
    return (
        <>
            <CopyField
                t={t}
                settingKey={slot.titleKey}
                label={t.publicCopy.featureTitleLabel.replace('{n}', position)}
                helper={t.publicCopy.featureHelper}
                value={settings[slot.titleKey] ?? ''}
                onChange={onChange}
            />
            <CopyField
                t={t}
                settingKey={slot.lineKey}
                label={t.publicCopy.featureLineLabel.replace('{n}', position)}
                value={settings[slot.lineKey] ?? ''}
                isLast={isLast}
                onChange={onChange}
            />
        </>
    );
}

export function PublicCopySection({
    t,
    settings,
    update,
}: Readonly<{
    t: Dictionary;
    settings: SettingsMap;
    update: (key: PublicCopyKey, value: string) => void;
}>) {
    const lastSlot = PUBLIC_FEATURE_SLOTS.length - 1;

    return (
        <SettingsSection title={t.publicCopy.sectionTitle}>
            <CopyField
                t={t}
                settingKey='publicHeroHeadline'
                label={t.publicCopy.heroHeadlineLabel}
                helper={t.publicCopy.heroHeadlineHelper}
                value={settings.publicHeroHeadline ?? ''}
                onChange={update}
            />
            <CopyField
                t={t}
                settingKey='publicHeroSubline'
                label={t.publicCopy.heroSublineLabel}
                helper={t.publicCopy.heroSublineHelper}
                value={settings.publicHeroSubline ?? ''}
                onChange={update}
            />
            <CopyField
                t={t}
                settingKey='publicAbout'
                label={t.publicCopy.aboutLabel}
                helper={t.publicCopy.aboutHelper}
                value={settings.publicAbout ?? ''}
                isMultiline
                onChange={update}
            />
            {PUBLIC_FEATURE_SLOTS.map((slot, index) => (
                <FeatureSlotRows
                    key={slot.titleKey}
                    t={t}
                    slot={slot}
                    settings={settings}
                    isLast={index === lastSlot}
                    onChange={update}
                />
            ))}
        </SettingsSection>
    );
}

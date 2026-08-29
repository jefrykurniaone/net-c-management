'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

const CUSTOM = 'custom';

/** Preset minute values offered in the select; anything else is custom. */
const PRESET_MINUTES = ['60', '30', '15'] as const;

function isPreset(value: string): boolean {
    return (PRESET_MINUTES as readonly string[]).includes(value);
}

interface HoldDurationFieldProps {
    /** Configured duration in minutes, as stored in Settings (string). */
    value: string;
    onChange: (minutes: string) => void;
}

/**
 * Admin picker for the reservation-hold payment deadline: 1h / 30m / 15m
 * presets, or a custom minute count. Emits minutes as a string — the Settings
 * table stores string values and the server falls back to the 60-minute
 * default when the stored value isn't a positive integer.
 *
 * The primary label and hint are the caller's `SettingsRow` — this field
 * draws only the select and, once "Custom" is picked, its own sub-field.
 */
export function HoldDurationField({
    value,
    onChange,
}: Readonly<HoldDurationFieldProps>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    // Once the admin picks "custom", stay there even if they type a preset
    // number (e.g. a custom 30) — only an explicit preset pick leaves it.
    const [isCustomSelected, setIsCustomSelected] = useState(!isPreset(value));

    const presetLabels: Record<(typeof PRESET_MINUTES)[number], string> = {
        '60': t.admin.holdDuration60,
        '30': t.admin.holdDuration30,
        '15': t.admin.holdDuration15,
    };

    function handleSelect(selected: string) {
        if (selected === CUSTOM) {
            setIsCustomSelected(true);
            return;
        }
        setIsCustomSelected(false);
        onChange(selected);
    }

    return (
        <div className='space-y-1.5'>
            <Select
                value={isCustomSelected ? CUSTOM : value}
                onValueChange={handleSelect}>
                <SelectTrigger id='holdDuration' className='w-full'>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {PRESET_MINUTES.map((minutes) => (
                        <SelectItem key={minutes} value={minutes}>
                            {presetLabels[minutes]}
                        </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM}>
                        {t.admin.holdDurationCustom}
                    </SelectItem>
                </SelectContent>
            </Select>
            {isCustomSelected && (
                <div className='space-y-1.5 pt-1'>
                    <Label htmlFor='holdDurationCustom'>
                        {t.admin.holdDurationCustomLabel}
                    </Label>
                    <Input
                        id='holdDurationCustom'
                        type='number'
                        min={1}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </div>
            )}
        </div>
    );
}

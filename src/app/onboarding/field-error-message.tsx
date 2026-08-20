'use client';

import { useFormField } from '@/components/ui/form';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The onboarding dictionary keys that name a problem *and* its fix
 * (DESIGN.md, Inputs: "the message names the problem and the fix").
 */
type OnboardingErrorKey =
    | 'nameErrorTooShort'
    | 'nameErrorTooLong'
    | 'phoneErrorTooShort'
    | 'phoneErrorTooLong'
    | 'phoneErrorInvalidChars'
    | 'activityErrorRequired';

/**
 * Maps a Zod issue code — the `type` `@hookform/resolvers/zod` already sets
 * on `error.type` — to the dictionary key that replaces its raw message. The
 * schema in `src/lib/validations/user.ts` is shared with the profile edit
 * form and stays untouched; the "name the problem and the fix" rewrite
 * happens only here, at the render site.
 */
type ErrorKeyMap = Readonly<Record<string, OnboardingErrorKey | undefined>>;

export const NAME_ERROR_KEYS: ErrorKeyMap = {
    too_small: 'nameErrorTooShort',
    too_big: 'nameErrorTooLong',
};

export const PHONE_ERROR_KEYS: ErrorKeyMap = {
    too_small: 'phoneErrorTooShort',
    too_big: 'phoneErrorTooLong',
    invalid_format: 'phoneErrorInvalidChars',
};

export const ACTIVITY_ERROR_KEYS: ErrorKeyMap = {
    too_small: 'activityErrorRequired',
};

/**
 * Renders a field's validation error from the dictionary instead of the raw
 * Zod message, so both locales carry the fix rather than just the rule. Must
 * be rendered inside a `<FormField>`/`<FormItem>` pair — it reads the same
 * `formMessageId` shadcn's own `<FormMessage>` would use, so
 * `FormControl`'s `aria-describedby` still resolves to a real element.
 *
 * Falls back to the raw Zod message for any issue code this form's schema
 * cannot actually produce, so an error is never silently dropped.
 */
export function FieldErrorMessage({
    t,
    keyMap,
}: Readonly<{ t: Dictionary; keyMap: ErrorKeyMap }>) {
    const { error, formMessageId } = useFormField();
    if (!error) {
        return null;
    }

    const key = error.type ? keyMap[error.type] : undefined;
    const message = key ? t.onboarding[key] : error.message;
    if (!message) {
        return null;
    }

    return (
        <p
            id={formMessageId}
            className='type-caption font-medium text-destructive'>
            {message}
        </p>
    );
}

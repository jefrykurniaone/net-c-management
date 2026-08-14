import { describe, expect, it } from 'vitest';
import {
    ACTIVITY_INITIAL_PLACEHOLDER,
    activityInitial,
} from '../activity-initial';

describe('activityInitial', () => {
    it('takes the first letter of the name in caps', () => {
        expect(activityInitial('Badminton')).toBe('B');
        expect(activityInitial('Futsal')).toBe('F');
    });

    it('upper-cases a lowercase initial', () => {
        expect(activityInitial('badminton')).toBe('B');
    });

    it('ignores leading and trailing whitespace', () => {
        expect(activityInitial('   Tenis Meja  ')).toBe('T');
    });

    it('degrades to a stable placeholder for an empty or blank name', () => {
        expect(activityInitial('')).toBe(ACTIVITY_INITIAL_PLACEHOLDER);
        expect(activityInitial('   ')).toBe(ACTIVITY_INITIAL_PLACEHOLDER);
        expect(activityInitial('\t\n')).toBe(ACTIVITY_INITIAL_PLACEHOLDER);
    });

    it('keeps a non-Latin initial intact', () => {
        expect(activityInitial('羽毛球')).toBe('羽');
        expect(activityInitial('كرة الريشة')).toBe('ك');
        expect(activityInitial('Бадминтон')).toBe('Б');
    });

    it('never returns more than one grapheme', () => {
        // German ß upper-cases to the two-character "SS".
        expect(activityInitial('ßadminton')).toHaveLength(1);
        // An astral-plane character must not be split into a lone surrogate.
        expect(activityInitial('🏸 Badminton')).toBe('🏸');
        // A combining mark stays attached to the letter it modifies.
        expect(activityInitial('équipe')).toBe('É');
    });
});

import { describe, expect, it, vi } from 'vitest';
import { sendAdmission } from '../email/admission';
import { sendDayReminder } from '../email/day-reminder';
import { sendDuesChangeQueued } from '../email/dues-change-queued';
import { sendDuesChangeReplaced } from '../email/dues-change-replaced';
import { sendDuesChangeWithdrawn } from '../email/dues-change-withdrawn';
import { sendHoldConfirmation } from '../email/hold-confirmation';
import { sendHoldExpired } from '../email/hold-expired';
import { sendPaymentStatus } from '../email/payment-status';
import { sendSessionReminder } from '../email/session-reminder';
import type { EmailLocale } from '../email/layout';

/**
 * Proves the Rally email shell (#157) changed how every template *looks* and
 * changed no word of what it *says*.
 *
 * `sendEmail` is mocked so no template ever reaches nodemailer — nothing here
 * sends mail. Each of the nine templates is called once per locale (18 cases,
 * the count the ticket asks for) and the HTML it produced is reduced to its
 * text — tags stripped, whitespace collapsed — then locked with
 * `toMatchSnapshot()`. The committed snapshot file is the "before" state: a
 * shell change that alters a single word anywhere fails here with a diff; a
 * shell change that only moves colours and markup passes unchanged.
 */

vi.mock('../email/transporter', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../email/transporter')>();
    return {
        ...actual,
        sendEmail: vi.fn(async () => undefined),
    };
});

const { sendEmail } = await import('../email/transporter');

const COMMUNITY_NAME = 'XClub Community';
const SESSION_DATE = new Date('2026-09-12T00:00:00Z');

function strippedText(html: string): string {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

async function renderedText(send: () => Promise<void>): Promise<string> {
    const mockSendEmail = vi.mocked(sendEmail);
    mockSendEmail.mockClear();
    await send();
    const call = mockSendEmail.mock.calls.at(0)?.[0];
    if (!call) throw new Error('sendEmail was not called');
    return `${call.subject}\n${strippedText(call.html)}`;
}

interface TemplateCase {
    name: string;
    send: (locale: EmailLocale) => Promise<void>;
}

const CASES: TemplateCase[] = [
    {
        name: 'admission',
        send: (locale) =>
            sendAdmission({
                to: 'nadia@example.com',
                name: 'Nadia',
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
    {
        name: 'hold-confirmation',
        send: (locale) =>
            sendHoldConfirmation({
                to: 'nadia@example.com',
                name: 'Nadia',
                sessionTitle: 'Badminton',
                sessionDate: SESSION_DATE,
                startTime: '19:00',
                location: 'Court 3',
                fee: 50_000,
                holdMinutes: 60,
                payPath: '/payments/upload',
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
    {
        name: 'hold-expired',
        send: (locale) =>
            sendHoldExpired({
                to: 'nadia@example.com',
                name: 'Nadia',
                sessionId: 'sess-1',
                sessionTitle: 'Badminton',
                sessionDate: SESSION_DATE,
                startTime: '19:00',
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
    {
        name: 'day-reminder',
        send: (locale) =>
            sendDayReminder({
                to: 'nadia@example.com',
                name: 'Nadia',
                sessionId: 'sess-1',
                sessionTitle: 'Badminton',
                sessionDate: SESSION_DATE,
                startTime: '19:00',
                endTime: '21:00',
                location: 'Court 3',
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
    {
        name: 'session-reminder',
        send: (locale) =>
            sendSessionReminder({
                to: 'nadia@example.com',
                name: 'Nadia',
                sessionId: 'sess-1',
                sessionTitle: 'Badminton',
                sessionDate: SESSION_DATE,
                startTime: '19:00',
                location: 'Court 3',
                registered: 8,
                max: 12,
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
    {
        name: 'payment-status',
        send: (locale) =>
            sendPaymentStatus({
                to: 'nadia@example.com',
                name: 'Nadia',
                status: 'CONFIRMED',
                amount: 150_000,
                billedFor: 'Badminton — September 2026',
                notes: null,
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
    {
        name: 'dues-change-queued',
        send: (locale) =>
            sendDuesChangeQueued({
                to: 'nadia@example.com',
                name: 'Nadia',
                activityName: 'Badminton',
                amount: 200_000,
                month: 10,
                year: 2026,
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
    {
        name: 'dues-change-replaced',
        send: (locale) =>
            sendDuesChangeReplaced({
                to: 'nadia@example.com',
                name: 'Nadia',
                activityName: 'Badminton',
                amount: 220_000,
                month: 10,
                year: 2026,
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
    {
        name: 'dues-change-withdrawn',
        send: (locale) =>
            sendDuesChangeWithdrawn({
                to: 'nadia@example.com',
                name: 'Nadia',
                activityName: 'Badminton',
                amount: 150_000,
                month: 10,
                year: 2026,
                communityName: COMMUNITY_NAME,
                locale,
            }),
    },
];

describe('email shell (#157), rendered text unchanged in both locales', () => {
    for (const { name, send } of CASES) {
        for (const locale of ['en', 'id'] as const) {
            it(`${name} — ${locale}`, async () => {
                const text = await renderedText(() => send(locale));
                expect(text).toMatchSnapshot();
            });
        }
    }
});

describe('email shell (#157), the status chip does not touch payment-status wording', () => {
    it('keeps the rejected wording when the chip variant flips to void', async () => {
        const text = await renderedText(() =>
            sendPaymentStatus({
                to: 'nadia@example.com',
                name: 'Nadia',
                status: 'REJECTED',
                amount: 150_000,
                billedFor: 'Badminton — September 2026',
                notes: 'Blurry proof',
                communityName: COMMUNITY_NAME,
                locale: 'en',
            }),
        );
        expect(text).toMatchSnapshot();
    });
});

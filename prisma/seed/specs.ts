/** Session specs (upcoming + scenario) derived from the anchor date. */
import { SessionStatus } from '@prisma/client';
import {
    now,
    addDays,
    nextWeekday,
    startOfDay,
    uniquePeriods,
    Period,
} from './dates';
import { SUNDAY, TUESDAY, THURSDAY, SATURDAY } from './config';

const DRILLS_OFFSET_DAYS = 6; // Saturday after the Sunday rally
const FUTSAL_OFFSET_DAYS = 5; // Friday after the Sunday rally

export const RALLY_DATE = nextWeekday(now, SUNDAY);
export const DRILLS_DATE = addDays(RALLY_DATE, DRILLS_OFFSET_DAYS);
export const FUTSAL_DATE = addDays(RALLY_DATE, FUTSAL_OFFSET_DAYS);
export const BASKET_DATE = nextWeekday(now, TUESDAY);
export const TENNIS_DATE = nextWeekday(now, THURSDAY);

export interface SessionSpec {
    key: string;
    slug: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    maxPlayers: number;
    fee: number;
    status?: SessionStatus;
}

export const UPCOMING_SPECS: SessionSpec[] = [
    { key: 'rally', slug: 'badminton', title: 'Weekly Rally Night', date: RALLY_DATE, startTime: '19:00', endTime: '21:00', location: 'GOR Cempaka Court 3', maxPlayers: 24, fee: 25_000 },
    { key: 'drills', slug: 'badminton', title: 'Morning Drills', date: DRILLS_DATE, startTime: '07:00', endTime: '09:00', location: 'GOR Cempaka Court 1', maxPlayers: 24, fee: 25_000 },
    { key: 'futsal', slug: 'futsal', title: 'Futsal Friday', date: FUTSAL_DATE, startTime: '20:00', endTime: '22:00', location: 'Champions Arena B', maxPlayers: 12, fee: 15_000 },
    { key: 'basket', slug: 'basket', title: 'Pickup Game', date: BASKET_DATE, startTime: '19:30', endTime: '21:30', location: 'GBK Basketball Hall', maxPlayers: 10, fee: 20_000 },
    { key: 'tennis', slug: 'tennis', title: 'Singles Ladder', date: TENNIS_DATE, startTime: '17:00', endTime: '19:00', location: 'Senayan Tennis Court 2', maxPlayers: 8, fee: 20_000 },
];

/** Scenario sessions — one per feature/edge case the app must render. */
export const SCENARIO_SPECS: Record<string, SessionSpec> = {
    // fee = 0 → the Maybe button appears; mixed RSVP states.
    freeMaybe: { key: 'freeMaybe', slug: 'badminton', title: 'Free Play (Maybe Test)', date: nextWeekday(now, SATURDAY), startTime: '10:00', endTime: '12:00', location: 'GOR Cempaka Court 2', maxPlayers: 20, fee: 0 },
    // Reservation-hold lab: confirmed / pending session payments + live and expired holds.
    holdLab: { key: 'holdLab', slug: 'badminton', title: 'Hold Lab (Per-Session Test)', date: addDays(startOfDay(now), 4), startTime: '18:00', endTime: '20:00', location: 'GOR Cempaka Court 4', maxPlayers: 8, fee: 25_000 },
    // Every seat funded and taken → tests the "Full" state as Adi (not attending).
    full: { key: 'full', slug: 'badminton', title: 'Full Court Challenge', date: addDays(startOfDay(now), 5), startTime: '19:00', endTime: '21:00', location: 'GOR Cempaka Court 5', maxPlayers: 6, fee: 25_000 },
    // 2 going < minMembers (4) → admin "remind members" flow, lastReminderAt null.
    underbooked: { key: 'underbooked', slug: 'futsal', title: 'Underbooked Friendly', date: addDays(startOfDay(now), 8), startTime: '20:00', endTime: '22:00', location: 'Champions Arena A', maxPlayers: 12, fee: 15_000 },
    // Cancelled session with attendees → tests CANCELLED rendering + no-register.
    cancelled: { key: 'cancelled', slug: 'badminton', title: 'Rained Out (Cancelled)', date: addDays(startOfDay(now), 3), startTime: '19:00', endTime: '21:00', location: 'GOR Cempaka Court 3', maxPlayers: 24, fee: 25_000, status: SessionStatus.CANCELLED },
    // Happening right now (anchor day) → tests the ONGOING state.
    ongoing: { key: 'ongoing', slug: 'basket', title: 'Live Pickup (Ongoing)', date: startOfDay(now), startTime: '19:30', endTime: '21:30', location: 'GBK Basketball Hall', maxPlayers: 10, fee: 20_000, status: SessionStatus.ONGOING },
    // Scheduled today, dayReminderSentAt = null → target for the day-reminder cron.
    todayReminder: { key: 'todayReminder', slug: 'tennis', title: 'Today Ladder (Reminder Test)', date: startOfDay(now), startTime: '17:00', endTime: '19:00', location: 'Senayan Tennis Court 2', maxPlayers: 8, fee: 20_000 },
};

const ALL_SPECS = [...UPCOMING_SPECS, ...Object.values(SCENARIO_SPECS)];

/** Monthly periods a member's dues must cover for an activity's sessions. */
export function activityPeriods(slug: string): Period[] {
    const dates = ALL_SPECS.filter((s) => s.slug === slug).map((s) => s.date);
    return uniquePeriods([now, ...dates]);
}

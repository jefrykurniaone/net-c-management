/** Base rows: settings, activities, staff accounts, member accounts. */
import { Role } from '@prisma/client';
import { BEGINNING_OF_TIME } from '../../src/lib/billing-period';
import { prisma } from './client';
import {
    SETTINGS,
    ACTIVITY_CONFIGS,
    LOGIN_EMAIL,
    MEMBER_NAMES,
    slugEmail,
} from './config';

export async function seedSettings() {
    for (const [key, value] of Object.entries(SETTINGS)) {
        await prisma.settings.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }
    console.log(`[ok] Settings: ${SETTINGS.communityName}`);
}

/**
 * Every Activity carries a beginning-of-time Dues Rate, so a reset database
 * resolves every Billing Period the way a migrated one does rather than only a
 * migrated one. Upserted on `(activityId, effectiveFrom)` because this seeder is
 * re-runnable and upserts the Activity above rather than recreating it.
 * `setById` stays null for the same reason the migration's rows leave it null:
 * nobody set this rate, it is the Activity's price from the beginning.
 */
export async function seedActivities(): Promise<Map<string, string>> {
    const idBySlug = new Map<string, string>();
    for (const e of ACTIVITY_CONFIGS) {
        const { slug, ...data } = e;
        const activity = await prisma.activity.upsert({
            where: { slug },
            update: data,
            create: { slug, ...data },
        });
        await prisma.duesRate.upsert({
            where: {
                activityId_effectiveFrom: {
                    activityId: activity.id,
                    effectiveFrom: BEGINNING_OF_TIME,
                },
            },
            update: { amount: activity.monthlyFee },
            create: {
                activityId: activity.id,
                amount: activity.monthlyFee,
                effectiveFrom: BEGINNING_OF_TIME,
            },
        });
        idBySlug.set(slug, activity.id);
        console.log(`[ok] Activity: ${activity.name} (Dues Rate ${activity.monthlyFee})`);
    }
    return idBySlug;
}

/** Upsert the three staff accounts; returns the owner id (payment confirmer). */
export async function seedStaff(): Promise<string> {
    const staff = [
        {
            email: process.env.SEED_OWNER_EMAIL?.trim() || 'owner@xclub.local',
            name: 'Owner',
            role: Role.OWNER,
            phone: '6281200000000',
        },
        {
            email: process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@xclub.local',
            name: 'Admin Satu',
            role: Role.ADMIN,
            phone: '6281200000001',
        },
        {
            email: 'admin2@xclub.local',
            name: 'Admin Dua',
            role: Role.ADMIN,
            phone: '6281200000002',
        },
    ];
    let ownerId = '';
    for (const u of staff) {
        // `admittedAt` is mandatory on every seeded staff row. Joining is
        // approval-gated and a null `admittedAt` means Applicant — seeding an
        // OWNER without it locks the only person who can work the queue out of
        // the queue.
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                role: u.role,
                phone: u.phone,
                isActive: true,
                isProfileComplete: true,
                admittedAt: new Date(),
            },
            create: {
                ...u,
                isActive: true,
                isProfileComplete: true,
                admittedAt: new Date(),
            },
        });
        if (u.role === Role.OWNER) ownerId = user.id;
        console.log(`[ok] ${u.role}: ${u.email}`);
    }
    return ownerId;
}

async function upsertMember(email: string, name: string, phone: string): Promise<string> {
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            isActive: true,
            isProfileComplete: true,
            admittedAt: new Date(),
        },
        create: {
            email,
            name,
            role: Role.MEMBER,
            phone,
            isActive: true,
            isProfileComplete: true,
            admittedAt: new Date(),
        },
    });
    return user.id;
}

/** Email of the one deliberately-incomplete member (onboarding-flow target). */
export const INCOMPLETE_MEMBER_EMAIL = 'newbie@xclub.local';

/**
 * One member whose profile is NOT complete: signs in but is bounced to
 * /onboarding, and shows the "Profile Incomplete" badge in the admin list. Has
 * no memberships. Reseeding resets it even if a tester completed onboarding.
 */
async function upsertIncompleteMember(): Promise<void> {
    // Admitted on purpose: this fixture exercises the *onboarding* flow, so it
    // has to land on /dashboard after submitting rather than in the waiting
    // room. The two fixtures below are the gate's own targets.
    await prisma.user.upsert({
        where: { email: INCOMPLETE_MEMBER_EMAIL },
        update: {
            isProfileComplete: false,
            isActive: true,
            phone: null,
            admittedAt: new Date(),
        },
        create: {
            email: INCOMPLETE_MEMBER_EMAIL,
            name: 'Newbie (No Onboarding)',
            role: Role.MEMBER,
            isActive: true,
            isProfileComplete: false,
            admittedAt: new Date(),
        },
    });
    console.log(`[ok] Incomplete-profile member: ${INCOMPLETE_MEMBER_EMAIL} (onboarding-flow test)`);
}

/** Emails of the two admission-gate fixtures (dev login → /pending). */
export const WAITING_APPLICANT_EMAIL = 'applicant@xclub.local';
export const DECLINED_APPLICANT_EMAIL = 'declined@xclub.local';

/**
 * The gate's own two fixtures, so the admission queue and both closed-door
 * states can be seen without waiting for a real stranger to sign in:
 *
 * - a **waiting** Applicant — profile complete with a phone (what the Admin
 *   judges on), one Activity picked, `admittedAt` null and not revoked, so the
 *   queue and the nav badge both count them;
 * - a **declined** one — `isActive` false with `admittedAt` still null, so they
 *   are out of the queue and their waiting page reads as a closed door.
 *
 * Neither is added to any id map: they must not be picked up by a roster loop,
 * an attendance seeder, or a payment seeder.
 */
export async function seedApplicants(idBySlug: Map<string, string>): Promise<void> {
    const firstActivityId = [...idBySlug.values()][0];

    const fixtures = [
        {
            email: WAITING_APPLICANT_EMAIL,
            name: 'Wulandari (Waiting)',
            phone: '6281200000098',
            isActive: true,
        },
        {
            email: DECLINED_APPLICANT_EMAIL,
            name: 'Bagas (Declined)',
            phone: '6281200000099',
            isActive: false,
        },
    ];

    for (const f of fixtures) {
        const user = await prisma.user.upsert({
            where: { email: f.email },
            // `admittedAt: null` on update too: reseeding after a tester admitted
            // them puts them back at the door.
            update: {
                name: f.name,
                phone: f.phone,
                isActive: f.isActive,
                isProfileComplete: true,
                admittedAt: null,
            },
            create: {
                email: f.email,
                name: f.name,
                phone: f.phone,
                role: Role.MEMBER,
                isActive: f.isActive,
                isProfileComplete: true,
                admittedAt: null,
            },
        });
        if (firstActivityId) {
            await prisma.membership.upsert({
                where: {
                    userId_activityId: {
                        userId: user.id,
                        activityId: firstActivityId,
                    },
                },
                update: { isActive: true },
                create: { userId: user.id, activityId: firstActivityId, isActive: true },
            });
        }
    }
    console.log(
        `[ok] Applicants: ${WAITING_APPLICANT_EMAIL} (waiting), ${DECLINED_APPLICANT_EMAIL} (declined)`,
    );
}

/** Upsert Adi + every named member; returns an email → userId map. */
export async function seedMembers(): Promise<Map<string, string>> {
    const idByEmail = new Map<string, string>();
    idByEmail.set(LOGIN_EMAIL, await upsertMember(LOGIN_EMAIL, 'Adi Pratama', '6281200000010'));
    let phoneSeq = 20;
    for (const name of MEMBER_NAMES) {
        const email = slugEmail(name);
        const phone = `628120000${String(phoneSeq++).padStart(4, '0')}`;
        idByEmail.set(email, await upsertMember(email, name, phone));
    }
    console.log(`[ok] Members: ${idByEmail.size} (incl. Adi Pratama)`);
    // Not added to the id map on purpose: it has no memberships/attendances and
    // must not be picked up by any roster loop.
    await upsertIncompleteMember();
    return idByEmail;
}

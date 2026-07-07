/** Base rows: settings, activities, staff accounts, member accounts. */
import { Role } from '@prisma/client';
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

export async function seedActivities(): Promise<Map<string, string>> {
    const idBySlug = new Map<string, string>();
    for (const e of ACTIVITY_CONFIGS) {
        const { slug, ...data } = e;
        const activity = await prisma.activity.upsert({
            where: { slug },
            update: data,
            create: { slug, ...data },
        });
        idBySlug.set(slug, activity.id);
        console.log(`[ok] Activity: ${activity.name}`);
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
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { role: u.role, phone: u.phone, isActive: true, isProfileComplete: true },
            create: { ...u, isActive: true, isProfileComplete: true },
        });
        if (u.role === Role.OWNER) ownerId = user.id;
        console.log(`[ok] ${u.role}: ${u.email}`);
    }
    return ownerId;
}

async function upsertMember(email: string, name: string, phone: string): Promise<string> {
    const user = await prisma.user.upsert({
        where: { email },
        update: { name, isActive: true, isProfileComplete: true },
        create: {
            email,
            name,
            role: Role.MEMBER,
            phone,
            isActive: true,
            isProfileComplete: true,
        },
    });
    return user.id;
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
    return idByEmail;
}

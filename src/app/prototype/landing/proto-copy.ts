/**
 * PROTOTYPE — throwaway (wayfinder ticket 07).
 *
 * Copy lives here, not in `src/lib/i18n/dictionaries.ts`, on purpose: ticket 08
 * ruled that the dictionary authors everything and restructures `landing` into
 * one sub-block per band — but the band list is exactly what this ticket is
 * deciding, so no key can be written until a variant wins. The shape below is
 * deliberately the shape 08 asked for (one block per band, each carrying its
 * heading, body and **empty string**) so the winner transcribes rather than
 * redesigns.
 *
 * The `id` strings are long-form on purpose. `PRODUCT.md:69` puts Indonesian
 * 15–30% longer, and the pitch has a ≈54-character budget from ticket 02.
 */

export type ProtoLang = 'en' | 'id';

export const LANDING_COPY = {
    en: {
        // Hero — ticket 06 closed this inventory at six elements. Not 07's to
        // change; reproduced so the bands below compose against the real thing.
        hero: {
            // 41 chars. Ticket 02 budgets 3 lines at the 5rem cap.
            pitch: 'A game every week, and a place to play it.',
            lead: 'This community runs the same sessions every week. Pick the ones you want, turn up, and pay your share.',
            cta: 'Join this community',
            // Ticket 06 decision 3: this is type-body, never caption. It carries
            // the gate, so it is not fine print.
            disclosure:
                'Signing in with Google asks to join. An organizer decides who comes in, and you will get an email the moment they do.',
            alreadyMember: 'Already a member? Sign in',
        },
        activities: {
            head: 'What you can play here',
            body: 'Each one runs on the same day every week, at the same place.',
            empty: 'Nothing has been posted here yet.',
            emptyMark: 'Not posted',
        },
        schedule: {
            head: 'Next on the schedule',
            body: 'The next three sessions, as they stand right now.',
            empty: 'No sessions are on the schedule yet.',
            emptyMark: 'Not posted',
        },
        closing: {
            head: 'Want in?',
            body: 'An organizer will let you in.',
            cta: 'Join this community',
        },
        labels: {
            everyWeek: 'Every week',
            where: 'Where',
            cost: 'Cost',
            free: 'Free',
            perMonth: '/ month',
            perSession: '/ session',
            fromHero: 'Scroll up to join',
        },
        footer: 'Run by its members.',
        days: [
            'Sundays',
            'Mondays',
            'Tuesdays',
            'Wednesdays',
            'Thursdays',
            'Fridays',
            'Saturdays',
        ],
    },
    id: {
        hero: {
            // 58 chars — over the English by design, to stress ticket 02's cap.
            pitch: 'Ada permainan setiap minggu, dan tempat untuk memainkannya.',
            lead: 'Komunitas ini menjalankan sesi yang sama setiap minggu. Pilih yang kamu mau, datang, lalu bayar bagianmu.',
            cta: 'Gabung ke komunitas ini',
            disclosure:
                'Masuk dengan Google berarti mengajukan diri untuk bergabung. Pengelola yang memutuskan siapa yang diterima, dan kamu akan menerima email begitu mereka memutuskan.',
            alreadyMember: 'Sudah jadi anggota? Masuk',
        },
        activities: {
            head: 'Yang bisa kamu mainkan di sini',
            body: 'Masing-masing berjalan di hari yang sama setiap minggu, di tempat yang sama.',
            empty: 'Belum ada yang diposting di sini.',
            emptyMark: 'Belum ada',
        },
        schedule: {
            head: 'Jadwal berikutnya',
            body: 'Tiga sesi berikutnya, sesuai keadaan saat ini.',
            empty: 'Belum ada sesi yang masuk jadwal.',
            emptyMark: 'Belum ada',
        },
        closing: {
            head: 'Mau ikut?',
            body: 'Pengelola akan menerimamu.',
            cta: 'Gabung ke komunitas ini',
        },
        labels: {
            everyWeek: 'Setiap minggu',
            where: 'Tempat',
            cost: 'Biaya',
            free: 'Gratis',
            perMonth: '/ bulan',
            perSession: '/ sesi',
            fromHero: 'Gulir ke atas untuk bergabung',
        },
        footer: 'Dijalankan oleh anggotanya.',
        days: [
            'Setiap Minggu',
            'Setiap Senin',
            'Setiap Selasa',
            'Setiap Rabu',
            'Setiap Kamis',
            'Setiap Jumat',
            'Setiap Sabtu',
        ],
    },
} as const;

export type LandingCopy = (typeof LANDING_COPY)['en'];

export function landingCopy(lang: ProtoLang): LandingCopy {
    return LANDING_COPY[lang] as LandingCopy;
}

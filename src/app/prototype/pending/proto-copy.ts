/**
 * PROTOTYPE — throwaway (wayfinder ticket 11). Copy lives here rather than in
 * `src/lib/i18n/dictionaries.ts` on purpose: none of these strings has been
 * decided yet, and the point of `?lang=id` is to check that the longer
 * Indonesian runs don't break any variant before the winner earns a dictionary
 * entry.
 */

export type ProtoLang = 'en' | 'id';

export const PENDING_COPY = {
    en: {
        waitingMark: 'Waiting',
        declinedMark: 'Declined',
        waitingTitle: 'An organizer is reviewing your request',
        waitingLead:
            'You asked to join. Someone who runs this community has to let you in — usually within a day or two. We will email you the moment they do.',
        declinedTitle: 'You have not been let in',
        declinedLead:
            'An organizer reviewed your request and did not admit you. If you think that is a mistake, message them — they decide, and they can change their mind.',
        submittedHead: 'What you sent',
        wantedHead: 'What you asked to join',
        askedHead: 'Asked',
        nameLabel: 'Name',
        phoneLabel: 'WhatsApp',
        emailLabel: 'Email',
        nextHead: 'What happens next',
        nextBody:
            'Nothing to do here. Close the tab — the email will bring you back.',
        whatsapp: 'Message an organizer',
        signOut: 'Sign out',
        sessionsHead: 'What this community is doing meanwhile',
        sessionsCaption:
            'Read-only until you are let in. You cannot claim a seat yet.',
        noSessions: 'Nothing on the schedule right now.',
        cannotJoinYet: 'Not yours yet',
    },
    id: {
        waitingMark: 'Menunggu',
        declinedMark: 'Ditolak',
        waitingTitle: 'Pengelola sedang meninjau permintaanmu',
        waitingLead:
            'Kamu sudah mengajukan diri untuk bergabung. Salah satu pengelola komunitas ini harus menerimamu dulu — biasanya dalam satu sampai dua hari. Kami akan mengirim email begitu itu terjadi.',
        declinedTitle: 'Kamu belum diterima masuk',
        declinedLead:
            'Pengelola sudah meninjau permintaanmu dan belum menerimamu. Kalau menurutmu ini keliru, hubungi mereka — keputusan ada di tangan mereka, dan mereka bisa berubah pikiran.',
        submittedHead: 'Yang kamu kirim',
        wantedHead: 'Yang ingin kamu ikuti',
        askedHead: 'Diajukan',
        nameLabel: 'Nama',
        phoneLabel: 'WhatsApp',
        emailLabel: 'Email',
        nextHead: 'Selanjutnya apa',
        nextBody:
            'Tidak ada yang perlu kamu lakukan di sini. Tutup saja tab ini — email akan memanggilmu kembali.',
        whatsapp: 'Hubungi pengelola',
        signOut: 'Keluar',
        sessionsHead: 'Yang sedang dijalankan komunitas ini',
        sessionsCaption:
            'Hanya bisa dilihat sampai kamu diterima. Kamu belum bisa mengambil tempat.',
        noSessions: 'Belum ada jadwal untuk saat ini.',
        cannotJoinYet: 'Belum milikmu',
    },
} as const;

export type PendingCopy = (typeof PENDING_COPY)['en'];

export function pendingCopy(lang: ProtoLang): PendingCopy {
    return PENDING_COPY[lang] as PendingCopy;
}

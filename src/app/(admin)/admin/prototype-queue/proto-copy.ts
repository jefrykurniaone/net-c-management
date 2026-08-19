/** PROTOTYPE — throwaway (wayfinder ticket 11). Undecided copy, both locales. */

export type ProtoLang = 'en' | 'id';

const QUEUE_COPY = {
    en: {
        pageTitle: 'Asking to join',
        pageSubtitle: '{n} waiting for a decision',
        queueHead: 'Asking to join',
        queueHint: 'They cannot see anything until you let them in',
        queueEmpty: 'Nobody is waiting.',
        queueEmptyMark: 'Empty',
        rosterHead: 'Members',
        rosterHint: '{n} people on the register',
        toRoster: 'Back to the register',
        admit: 'Admit',
        decline: 'Decline',
        stateWaiting: 'Waiting',
        stateMember: 'In',
        stateDeclined: 'Declined',
        filterLabel: 'Filter the register',
        filters: { all: 'All', waiting: 'Waiting', member: 'In', declined: 'Declined' },
    },
    id: {
        pageTitle: 'Mengajukan diri untuk bergabung',
        pageSubtitle: '{n} menunggu keputusan',
        queueHead: 'Mengajukan diri untuk bergabung',
        queueHint: 'Mereka belum bisa melihat apa pun sampai kamu menerima mereka',
        queueEmpty: 'Tidak ada yang menunggu.',
        queueEmptyMark: 'Kosong',
        rosterHead: 'Anggota',
        rosterHint: '{n} orang terdaftar',
        toRoster: 'Kembali ke daftar anggota',
        admit: 'Terima',
        decline: 'Tolak',
        stateWaiting: 'Menunggu',
        stateMember: 'Masuk',
        stateDeclined: 'Ditolak',
        filterLabel: 'Saring daftar anggota',
        filters: {
            all: 'Semua',
            waiting: 'Menunggu',
            member: 'Masuk',
            declined: 'Ditolak',
        },
    },
} as const;

export type QueueCopy = (typeof QUEUE_COPY)['en'];

export function queueCopy(lang: ProtoLang): QueueCopy {
    return QUEUE_COPY[lang] as QueueCopy;
}

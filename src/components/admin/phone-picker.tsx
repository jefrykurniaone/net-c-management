'use client';

import { useEffect, useState } from 'react';
import type { Role } from '@prisma/client';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface AdminContact {
    id: string;
    name: string | null;
    phone: string | null;
    role: Role;
    isSelf: boolean;
}

/**
 * "Fill from an admin's number" helper next to WhatsApp inputs. The API scopes
 * who is listed: an admin sees admins (never the owner), the owner sees both.
 */
export function PhonePicker({
    onPick,
}: Readonly<{ onPick: (phone: string) => void }>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [contacts, setContacts] = useState<AdminContact[]>([]);

    useEffect(() => {
        fetch('/api/users/admin-contacts')
            .then((r) => (r.ok ? r.json() : { contacts: [] }))
            .then((data: { contacts?: AdminContact[] }) =>
                setContacts(data.contacts ?? []),
            )
            .catch(() => setContacts([]));
    }, []);

    if (contacts.length === 0) return null;

    return (
        <Select
            value=''
            onValueChange={(id) => {
                const chosen = contacts.find((c) => c.id === id);
                if (chosen?.phone) onPick(chosen.phone);
            }}>
            <SelectTrigger className='w-full h-8 text-xs'>
                <SelectValue placeholder={t.admin.phonePickerPlaceholder} />
            </SelectTrigger>
            <SelectContent>
                {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                        {c.isSelf
                            ? t.admin.phonePickerSelf
                            : `${c.name ?? '—'} (${t.roles[c.role]})`}
                        {' · '}
                        <span className='tabular-nums'>{c.phone}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

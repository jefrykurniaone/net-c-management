'use client';

import { useState } from 'react';
import type { AttendanceStatus } from '@prisma/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusChip } from '@/components/ui/chip';
import { attendanceState, type ChipLabelKey } from '@/lib/status-chip';

const PREVIEW_COUNT = 4;

export interface PlayerItem {
    id: string;
    name: string;
    initials: string;
    image: string;
    /** The stored Attendance state. The chip resolver, not this list, decides
     *  how it is drawn — no surface computes its own status colour. */
    status: AttendanceStatus;
    isYou: boolean;
}

export function PlayerList({
    players,
    youLabel,
    showAllTemplate,
    chipLabels,
}: Readonly<{
    players: PlayerItem[];
    youLabel: string;
    showAllTemplate: string;
    chipLabels: Readonly<Record<ChipLabelKey, string>>;
}>) {
    const [expanded, setExpanded] = useState(false);
    const canCollapse = players.length > PREVIEW_COUNT;
    const visible = expanded ? players : players.slice(0, PREVIEW_COUNT);

    return (
        <div className='space-y-1'>
            {visible.map((player) => (
                <div key={player.id} className='flex items-center gap-3 py-2'>
                    <Avatar className='size-9'>
                        <AvatarImage src={player.image} alt='' />
                        <AvatarFallback className='text-xs bg-primary-soft text-primary'>
                            {player.initials}
                        </AvatarFallback>
                    </Avatar>
                    <p className='flex-1 min-w-0 truncate text-sm font-medium text-foreground'>
                        {player.name}
                        {player.isYou && (
                            <span className='ml-1 font-normal text-muted-foreground'>
                                ({youLabel})
                            </span>
                        )}
                    </p>
                    <StatusChip
                        state={attendanceState(player.status)}
                        labels={chipLabels}
                    />
                </div>
            ))}

            {canCollapse && !expanded && (
                <button
                    type='button'
                    onClick={() => setExpanded(true)}
                    className='w-full pt-3 text-center text-[13px] font-semibold text-primary hover:underline'>
                    {showAllTemplate.replace('{n}', String(players.length))}
                </button>
            )}
        </div>
    );
}

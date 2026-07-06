import Image from 'next/image';
import { cn, communityAbbr } from '@/lib/utils';

// Community identity mark (UX-DR9): the configured logo if set, else a rounded
// square abbreviation token — white on solid teal (Club Premium) — never a
// placeholder graphic. Renders the mark only; callers add the name label.
const MARK = {
    sm: { box: 'w-8 h-8 rounded-[9px]', text: 'text-xs', px: 32 },
    md: { box: 'w-9 h-9 rounded-[10px]', text: 'text-sm', px: 36 },
    lg: { box: 'w-16 h-16 rounded-2xl', text: 'text-2xl', px: 64 },
} as const;

export function CommunityIdentityMark({
    communityName,
    logoUrl,
    size = 'sm',
    className,
}: Readonly<{
    communityName: string;
    logoUrl?: string;
    size?: keyof typeof MARK;
    className?: string;
}>) {
    const { box, text, px } = MARK[size];

    if (logoUrl) {
        return (
            <Image
                src={logoUrl}
                alt={communityName}
                width={px}
                height={px}
                className={cn(box, 'object-cover shrink-0', className)}
            />
        );
    }

    return (
        <div
            className={cn(
                box,
                'bg-primary-solid flex items-center justify-center shrink-0',
                className,
            )}>
            <span
                className={cn(
                    'font-heading font-bold text-primary-solid-foreground',
                    text,
                )}>
                {communityAbbr(communityName)}
            </span>
        </div>
    );
}

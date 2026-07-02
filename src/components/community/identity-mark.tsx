import Image from 'next/image';
import { cn, communityAbbr } from '@/lib/utils';

// Community identity mark (UX-DR9): the configured logo if set, else a circular
// abbreviation token in the platform accent (`primary`) on `muted` — never a
// placeholder graphic. Renders the mark only; callers add the name label.
const MARK = {
    sm: { box: 'w-7 h-7', text: 'text-xs', px: 28 },
    md: { box: 'w-9 h-9', text: 'text-sm', px: 36 },
    lg: { box: 'w-16 h-16', text: 'text-2xl', px: 64 },
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
                className={cn(box, 'rounded-full object-cover shrink-0', className)}
            />
        );
    }

    return (
        <div
            className={cn(
                box,
                'bg-muted rounded-full flex items-center justify-center shrink-0',
                className,
            )}>
            <span className={cn('font-bold text-primary', text)}>
                {communityAbbr(communityName)}
            </span>
        </div>
    );
}

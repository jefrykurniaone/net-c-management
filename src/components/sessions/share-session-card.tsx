'use client';

import { useState, useEffect } from 'react';
import { Share2, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ShareSessionLabels {
    title: string;
    description: string;
    copyLink: string;
    copied: string;
    shareWhatsapp: string;
    shareX: string;
}

export function ShareSessionCard({
    sessionId,
    sessionTitle,
    labels,
}: Readonly<{
    sessionId: string;
    sessionTitle: string;
    labels: ShareSessionLabels;
}>) {
    const [origin, setOrigin] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const shareUrl = `${origin}/s/${sessionId}`;

    async function handleCopy() {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className='bg-card rounded-xl border border-border p-5'>
            <div className='flex items-start justify-between gap-2 mb-4'>
                <div>
                    <h2 className='text-sm font-semibold text-foreground'>
                        {labels.title}
                    </h2>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                        {labels.description}
                    </p>
                </div>
                <Share2 className='w-4 h-4 text-muted-foreground shrink-0 mt-0.5' />
            </div>

            <div className='flex items-center gap-2 mb-3'>
                <code className='flex-1 text-xs bg-muted rounded-md px-3 py-2 text-muted-foreground truncate'>
                    {shareUrl || `/s/${sessionId}`}
                </code>
                <Button
                    size='sm'
                    variant='outline'
                    className='shrink-0 gap-1.5'
                    onClick={handleCopy}>
                    {copied ? (
                        <Check className='w-3.5 h-3.5 text-green-600' />
                    ) : (
                        <Copy className='w-3.5 h-3.5' />
                    )}
                    {copied ? labels.copied : labels.copyLink}
                </Button>
            </div>

            {origin && (
                <div className='flex gap-2'>
                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(`${sessionTitle}\n${shareUrl}`)}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex-1'>
                        <Button
                            size='sm'
                            variant='outline'
                            className='w-full gap-1.5'>
                            <MessageCircle className='w-3.5 h-3.5' />
                            {labels.shareWhatsapp}
                        </Button>
                    </a>
                    <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(sessionTitle)}&url=${encodeURIComponent(shareUrl)}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex-1'>
                        <Button
                            size='sm'
                            variant='outline'
                            className='w-full gap-1.5'>
                            <ExternalLink className='w-3.5 h-3.5' />
                            {labels.shareX}
                        </Button>
                    </a>
                </div>
            )}
        </div>
    );
}

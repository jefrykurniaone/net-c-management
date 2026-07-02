import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Per-Activity "contact admin" CTA. Every phone number stored in the app is a
 * WhatsApp number, so this deep-links straight to a chat.
 */
export function WhatsappButton({
    phone,
    label,
}: Readonly<{ phone: string; label: string }>) {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    return (
        <a
            href={`https://wa.me/${digits}`}
            target='_blank'
            rel='noopener noreferrer'
            className='block'>
            <Button
                variant='outline'
                className='w-full gap-2 text-success border-success/40 hover:bg-success/10'>
                <MessageCircle className='w-4 h-4' />
                {label}
            </Button>
        </a>
    );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import {
    buildUpdateProfileSchema,
    type UpdateProfileFormData,
} from '@/lib/validations/user';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface EditInitial {
    name: string;
    phone: string;
    image: string | null;
}

type SavedProfile = {
    name: string | null;
    phone: string | null;
    image: string | null;
};

export function EditProfileDialog({
    open,
    onOpenChange,
    initial,
    onSaved,
}: Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: EditInitial;
    onSaved: (updated: SavedProfile) => void;
}>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const form = useForm<UpdateProfileFormData>({
        resolver: zodResolver(buildUpdateProfileSchema(t)),
        defaultValues: { name: initial.name, phone: initial.phone },
    });

    // Re-seed the form each time the dialog is opened, so it always reflects the
    // latest saved values rather than the first mount's snapshot. (react-hook-form
    // reset is not a React setState, so it's safe in an effect.) The avatar
    // preview is driven straight off `initial.image`, which the parent re-supplies
    // after every save/upload — no separate preview state to keep in sync.
    useEffect(() => {
        if (open) form.reset({ name: initial.name, phone: initial.phone });
    }, [open, initial.name, initial.phone, form]);

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/users/profile/avatar', {
                method: 'POST',
                body: fd,
            });
            if (!res.ok) {
                const err = (await res.json()) as { error?: string };
                throw new Error(err.error ?? t.profile.toastPhotoError);
            }
            const data = (await res.json()) as { image: string };
            onSaved({
                name: form.getValues('name') ?? null,
                phone: form.getValues('phone') ?? null,
                image: data.image,
            });
            toast.success(t.profile.toastPhotoSuccess);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setUploading(false);
            // reset so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function onSubmit(data: UpdateProfileFormData) {
        setSaving(true);
        try {
            const res = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = (await res.json()) as { error?: string };
                throw new Error(err.error ?? t.common.error);
            }
            toast.success(t.profile.toastSuccess);
            onSaved({
                name: data.name ?? null,
                phone: data.phone ?? null,
                image: initial.image,
            });
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setSaving(false);
        }
    }

    const fallback = (initial.name || initial.phone || '?')[0].toUpperCase();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t.profile.editTitle}</DialogTitle>
                    <DialogDescription>{t.profile.subtitle}</DialogDescription>
                </DialogHeader>

                <div className='flex justify-center'>
                    <button
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className='relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        aria-label={t.profile.changePhotoAlt}>
                        <Avatar className='size-20'>
                            <AvatarImage src={initial.image ?? ''} alt='' />
                            <AvatarFallback className='bg-primary/10 text-2xl font-bold text-primary'>
                                {fallback}
                            </AvatarFallback>
                        </Avatar>
                        <span className='absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-primary-solid text-primary-solid-foreground ring-2 ring-card'>
                            {uploading ? (
                                <span className='size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent' />
                            ) : (
                                <Camera className='size-3.5' />
                            )}
                        </span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/jpeg,image/png,image/webp'
                        className='hidden'
                        onChange={handleAvatarChange}
                    />
                </div>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className='space-y-4'>
                        <FormField
                            control={form.control}
                            name='name'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.profile.name}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t.profile.namePlaceholder}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name='phone'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.profile.phone}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t.profile.phonePlaceholder}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t.common.phoneCountryCodeHint}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type='submit'
                            className='w-full'
                            loading={saving}>
                            {t.profile.save}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

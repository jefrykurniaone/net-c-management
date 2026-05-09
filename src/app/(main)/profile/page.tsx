'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
    buildUpdateProfileSchema,
    type UpdateProfileFormData,
} from '@/lib/validations/user';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface Profile {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
    playPosition: string | null;
    playerLevel: string | null;
    role: string;
    createdAt: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            setProfile((prev) =>
                prev ? { ...prev, image: data.image } : prev,
            );
            toast.success(t.profile.toastPhotoSuccess);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : t.common.error,
            );
        } finally {
            setUploading(false);
            // reset so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    const form = useForm<UpdateProfileFormData>({
        resolver: zodResolver(buildUpdateProfileSchema(t)),
        defaultValues: {
            name: '',
            phone: '',
            playPosition: undefined,
            playerLevel: undefined,
        },
    });

    useEffect(() => {
        fetch('/api/users/profile')
            .then((r) => r.json())
            .then((data: Profile) => {
                setProfile(data);
                form.reset({
                    name: data.name ?? '',
                    phone: data.phone ?? '',
                    playPosition:
                        (data.playPosition as UpdateProfileFormData['playPosition']) ??
                        undefined,
                    playerLevel:
                        (data.playerLevel as UpdateProfileFormData['playerLevel']) ??
                        undefined,
                });
            })
            .finally(() => setLoading(false));
    }, [form]);

    async function onSubmit(data: UpdateProfileFormData) {
        setSaving(true);
        try {
            const res = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? t.common.error);
            }
            toast.success(t.profile.toastSuccess);
            router.refresh();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : t.common.error,
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className='text-gray-400 text-sm'>{t.common.loadingProfile}</div>;
    }

    return (
        <div className='max-w-lg space-y-6'>
            <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                    <User className='w-6 h-6 text-green-600' />
                    {t.profile.title}
                </h1>
                <p className='text-sm text-gray-500 mt-1'>
                    {t.profile.subtitle}
                </p>
            </div>

            {/* Account info */}
            {profile && (
                <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-5 flex items-center gap-4'>
                    <button
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className='relative group shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500'
                        aria-label={t.profile.changePhotoAlt}>
                        <Avatar className='w-14 h-14'>
                            <AvatarImage
                                src={profile.image ?? ''}
                                alt={profile.name ?? ''}
                            />
                            <AvatarFallback className='bg-green-100 text-green-700 font-bold text-xl'>
                                {(profile.name ??
                                    profile.email ??
                                    '?')[0].toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className='absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity'>
                            {uploading ? (
                                <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                            ) : (
                                <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    className='w-5 h-5 text-white'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='2'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'>
                                    <path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' />
                                    <circle cx='12' cy='13' r='4' />
                                </svg>
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
                    <div>
                        <p className='font-semibold text-gray-900 dark:text-white'>
                            {profile.name ?? `(${t.profile.roleMember})`}
                        </p>
                        <p className='text-sm text-gray-400'>{profile.email}</p>
                        <Badge
                            variant={
                                profile.role === 'ADMIN'
                                    ? 'default'
                                    : 'secondary'
                            }
                            className='mt-1 text-xs'>
                            {profile.role === 'ADMIN' ? t.profile.roleAdmin : t.profile.roleMember}
                        </Badge>
                    </div>
                </div>
            )}

            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6'>
                <h2 className='font-semibold text-gray-900 dark:text-white mb-5'>
                    {t.profile.editTitle}
                </h2>

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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name='playPosition'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.profile.position}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t.profile.positionPlaceholder} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value='SINGLE'>
                                                {t.positions.SINGLE}
                                            </SelectItem>
                                            <SelectItem value='DOUBLE'>
                                                {t.positions.DOUBLE}
                                            </SelectItem>
                                            <SelectItem value='BOTH'>
                                                {t.positions.BOTH}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name='playerLevel'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.profile.level}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t.profile.levelPlaceholder} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value='BEGINNER'>
                                                {t.levels.BEGINNER}
                                            </SelectItem>
                                            <SelectItem value='INTERMEDIATE'>
                                                {t.levels.INTERMEDIATE}
                                            </SelectItem>
                                            <SelectItem value='ADVANCED'>
                                                {t.levels.ADVANCED}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type='submit'
                            className='w-full bg-green-600 hover:bg-green-700 text-white'
                            disabled={saving}>
                            {saving ? t.profile.saving : t.profile.save}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}

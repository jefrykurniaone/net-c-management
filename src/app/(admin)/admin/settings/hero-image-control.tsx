import type { RefObject } from 'react';
import Image from 'next/image';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { HERO_IMAGE_ACCEPT } from '@/lib/hero-image-file';

/**
 * Preview, upload and remove for the public page's hero photograph (#155),
 * split out of `public-copy-section.tsx` to keep that file under the
 * 300-line cap. Shape mirrors `settings-form.tsx`'s `LogoControl`, plus a
 * remove action the logo control does not have.
 */

interface HeroImageControlProps {
    t: Dictionary;
    heroImageSrc: string | null;
    uploadingHeroImage: boolean;
    removingHeroImage: boolean;
    heroImageButtonLabel: string;
    heroImageInputRef: RefObject<HTMLInputElement | null>;
    onUploadClick: () => void;
    onHeroImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveClick: () => void;
}

/** Props `HeroImageControl` takes minus `t`, which every section already has. */
export type HeroImageProps = Omit<HeroImageControlProps, 't'>;

function HeroImagePlaceholder() {
    return (
        <div className='flex h-20 w-32 items-center justify-center rounded-md border border-border bg-background'>
            <Upload className='h-6 w-6 text-muted-foreground' />
        </div>
    );
}

export function HeroImageControl({
    t,
    heroImageSrc,
    uploadingHeroImage,
    removingHeroImage,
    heroImageButtonLabel,
    heroImageInputRef,
    onUploadClick,
    onHeroImageChange,
    onRemoveClick,
}: Readonly<HeroImageControlProps>) {
    return (
        <div className='flex flex-wrap items-center gap-block'>
            {heroImageSrc ? (
                <Image
                    src={heroImageSrc}
                    alt={t.publicCopy.heroImageLabel}
                    width={128}
                    height={80}
                    className='h-20 w-32 rounded-md border border-border object-cover'
                />
            ) : (
                <HeroImagePlaceholder />
            )}
            <div className='flex gap-cell'>
                <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    loading={uploadingHeroImage}
                    onClick={onUploadClick}>
                    {heroImageButtonLabel}
                </Button>
                {heroImageSrc ? (
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        loading={removingHeroImage}
                        onClick={onRemoveClick}>
                        {t.publicCopy.heroImageRemove}
                    </Button>
                ) : null}
            </div>
            <input
                ref={heroImageInputRef}
                type='file'
                accept={HERO_IMAGE_ACCEPT}
                className='hidden'
                onChange={onHeroImageChange}
            />
        </div>
    );
}

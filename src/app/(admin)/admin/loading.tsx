import {
    PageHeaderSkeleton,
    StatCardsSkeleton,
} from '@/components/skeletons/page-skeletons';

export default function Loading() {
    return (
        <div className='space-y-6'>
            <PageHeaderSkeleton />
            <StatCardsSkeleton count={4} />
        </div>
    );
}

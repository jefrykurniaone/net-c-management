import {
    PageHeaderSkeleton,
    StatCardsSkeleton,
    ListSkeleton,
} from '@/components/skeletons/page-skeletons';

export default function Loading() {
    return (
        <div className='space-y-6'>
            <PageHeaderSkeleton />
            <StatCardsSkeleton count={3} />
            <ListSkeleton rows={3} />
        </div>
    );
}

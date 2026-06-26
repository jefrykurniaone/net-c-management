import {
    PageHeaderSkeleton,
    ListSkeleton,
} from '@/components/skeletons/page-skeletons';

export default function Loading() {
    return (
        <div className='space-y-6'>
            <PageHeaderSkeleton />
            <ListSkeleton rows={3} />
            <ListSkeleton rows={3} />
        </div>
    );
}

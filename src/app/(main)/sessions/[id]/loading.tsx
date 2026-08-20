import {
    PageHeaderSkeleton,
    ListSkeleton,
} from '@/components/skeletons/page-skeletons';
import { COLUMN_MEASURE } from '@/components/layout/measure';

export default function Loading() {
    return (
        <div className={`${COLUMN_MEASURE} space-y-6`}>
            <PageHeaderSkeleton />
            <ListSkeleton />
        </div>
    );
}

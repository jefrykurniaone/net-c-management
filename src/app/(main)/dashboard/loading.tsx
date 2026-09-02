import {
    PageHeaderSkeleton,
    StatCardsSkeleton,
    ChartCardSkeleton,
    ListSkeleton,
} from '@/components/skeletons/page-skeletons';
import { COLUMN_MEASURE } from '@/components/layout/measure';

export default function Loading() {
    return (
        <div className={`${COLUMN_MEASURE} space-y-6`}>
            <PageHeaderSkeleton />
            <StatCardsSkeleton count={3} />
            {/* #172: matches the attendance sparkline card below the stat grid. */}
            <ChartCardSkeleton />
            <ListSkeleton rows={3} />
        </div>
    );
}

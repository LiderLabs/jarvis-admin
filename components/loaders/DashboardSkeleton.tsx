import { StatsSkeleton } from "./StatsSkeleton";
import { RecentOrdersSkeleton } from "./RecentOrdersSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div>
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Stats Grid Skeleton */}
      <StatsSkeleton />

      {/* Recent Orders Skeleton */}
      <div className="mt-8">
        <RecentOrdersSkeleton />
      </div>
    </div>
  );
}


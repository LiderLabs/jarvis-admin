import { Skeleton } from "@/components/ui/skeleton";

export function RecentOrdersSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <Skeleton className="h-7 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-5 w-20 ml-auto" />
              <Skeleton className="h-6 w-16 ml-auto rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


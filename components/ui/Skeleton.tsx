interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-md bg-slate-200/60 dark:bg-slate-700/40 ${className}`}
        />
    );
}

/** Carte village skeleton pour /play */
export function VillageCardSkeleton() {
    return (
        <div className="relative bg-primary border-2 border-slate-200 rounded-xl p-4 flex items-center gap-4 overflow-hidden">
            <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-14 rounded-full" />
            </div>
        </div>
    );
}

/** Ligne de classement skeleton */
export function LeaderboardRowSkeleton() {
    return (
        <div className="grid grid-cols-[1fr_3fr_1fr] items-center py-2 gap-2">
            <Skeleton className="h-5 w-5 mx-auto rounded" />
            <div className="flex items-center gap-3 ml-4">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-10 mx-auto" />
        </div>
    );
}

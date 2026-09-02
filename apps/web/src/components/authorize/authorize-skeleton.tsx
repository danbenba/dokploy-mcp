import { Skeleton } from '@/components/ui/skeleton'

export function AuthorizeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the authorization request">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-13 rounded-2xl" />
          <Skeleton className="h-[3px] w-14" />
          <Skeleton className="size-13 rounded-2xl" />
        </div>
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-14 w-full rounded-full" />
        <div className="flex justify-center">
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  )
}

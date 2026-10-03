import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The landing page's container width and gutter, shared with the docs and legal sites. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1100px] px-6', className)}>{children}</div>
}

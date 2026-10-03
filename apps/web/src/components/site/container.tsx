import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ContainerWidth = 'default' | 'wide'

const WIDTHS: Record<ContainerWidth, string> = {
  /** The landing page's measure. */
  default: 'max-w-[1100px]',
  /** Room for a sidebar, a readable column and a page outline side by side. */
  wide: 'max-w-[1400px]',
}

/** The landing page's container width and gutter, shared with the docs and legal sites. */
export function Container({
  children,
  className,
  width = 'default',
}: {
  children: ReactNode
  className?: string
  width?: ContainerWidth
}) {
  return <div className={cn('mx-auto w-full px-6', WIDTHS[width], className)}>{children}</div>
}

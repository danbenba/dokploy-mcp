import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ContainerWidth = 'default' | 'wide'

const WIDTHS: Record<ContainerWidth, string> = {
  default: 'max-w-[1100px]',
  wide: 'max-w-[1400px]',
}

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

import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertBlockProps {
  type?: AlertType
  children: ReactNode
  className?: string
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES: Record<AlertType, string> = {
  success:
    'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
  error:
    'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
  warning:
    'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900',
}

export function AlertBlock({ type = 'info', children, className }: AlertBlockProps) {
  const Icon = ICONS[type]
  return (
    <Alert className={cn('flex items-start gap-3', STYLES[type], className)}>
      <Icon className="size-4 shrink-0 translate-y-0.5" />
      <AlertDescription className="text-current">{children}</AlertDescription>
    </Alert>
  )
}

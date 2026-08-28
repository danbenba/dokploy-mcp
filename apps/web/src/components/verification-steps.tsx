import { Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface VerificationStep {
  id: string
  label: string
  status: StepStatus
}

export const VERIFICATION_STEPS: Array<{ id: string; label: string }> = [
  { id: 'resolve', label: 'Resolving the address' },
  { id: 'reach', label: 'Connecting to the server' },
  { id: 'identify', label: 'Checking it is a Dokploy panel' },
]

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'running') {
    return <Loader2 className="size-4 animate-spin text-foreground" />
  }
  if (status === 'done') {
    return <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
  }
  if (status === 'failed') {
    return <X className="size-4 text-destructive" />
  }
  return <span className="size-1.5 rounded-full bg-muted-foreground/40" />
}

export function VerificationSteps({ steps }: { steps: VerificationStep[] }) {
  return (
    <ul className="space-y-3 rounded-lg border bg-muted/30 p-4">
      {steps.map((step) => (
        <li key={step.id} className="flex items-center gap-3 text-sm">
          <span className="flex size-4 items-center justify-center">
            <StepIcon status={step.status} />
          </span>
          <span
            className={cn(
              'transition-colors',
              step.status === 'pending' && 'text-muted-foreground',
              step.status === 'running' && 'text-foreground',
              step.status === 'done' && 'text-muted-foreground',
              step.status === 'failed' && 'text-destructive'
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

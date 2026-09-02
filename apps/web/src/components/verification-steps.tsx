import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ShinyText } from '@/components/shiny-text'
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
  const reduced = useReducedMotion()
  return (
    <span className="relative flex size-5 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {status === 'running' ? (
          <motion.span
            key="running"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative flex size-5 items-center justify-center"
          >
            <motion.span
              className="absolute inset-0 rounded-full border border-foreground/30"
              animate={reduced ? undefined : { scale: [1, 1.6], opacity: [0.7, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className="size-2 rounded-full bg-foreground"
              animate={reduced ? undefined : { scale: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.span>
        ) : status === 'done' ? (
          <motion.svg
            key="done"
            viewBox="0 0 20 20"
            className="size-5"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            <circle cx="10" cy="10" r="9" className="fill-emerald-500/15" />
            <motion.path
              d="M6 10.5l2.6 2.6L14.5 7"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-emerald-600 dark:stroke-emerald-400"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
            />
          </motion.svg>
        ) : status === 'failed' ? (
          <motion.svg
            key="failed"
            viewBox="0 0 20 20"
            className="size-5"
            initial={{ scale: 0.5, opacity: 0, x: 0 }}
            animate={reduced ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, x: [0, -3, 3, -2, 2, 0] }}
            transition={{ duration: 0.4 }}
          >
            <circle cx="10" cy="10" r="9" className="fill-destructive/15" />
            <path d="M7 7l6 6M13 7l-6 6" strokeWidth="2" strokeLinecap="round" className="stroke-destructive" />
          </motion.svg>
        ) : (
          <motion.span
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="size-1.5 rounded-full bg-muted-foreground/40"
          />
        )}
      </AnimatePresence>
    </span>
  )
}

export function VerificationSteps({ steps }: { steps: VerificationStep[] }) {
  const reduced = useReducedMotion()
  const doneCount = steps.filter((step) => step.status === 'done').length
  const runningIndex = steps.findIndex((step) => step.status === 'running')
  const reach = Math.min(
    1,
    (doneCount + (runningIndex >= 0 ? 0.5 : 0)) / Math.max(1, steps.length - 1)
  )
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-lg border bg-muted/30 p-4"
    >
      <span className="absolute left-[25.5px] top-6 bottom-6 w-px bg-border" aria-hidden="true" />
      <motion.span
        className="absolute left-[25.5px] top-6 w-px origin-top bg-foreground/60"
        style={{ height: 'calc(100% - 3rem)' }}
        animate={{ scaleY: reach }}
        transition={{ duration: reduced ? 0 : 0.45, ease: 'easeOut' }}
        aria-hidden="true"
      />
      <ul className="relative space-y-3">
        {steps.map((step, index) => (
          <motion.li
            key={step.id}
            initial={reduced ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduced ? 0 : index * 0.06 }}
            className="flex items-center gap-3 text-sm"
          >
            <span className="relative z-10 flex size-5 items-center justify-center rounded-full bg-background">
              <StepIcon status={step.status} />
            </span>
            {step.status === 'running' && !reduced ? (
              <ShinyText
                text={step.label}
                speed={1.6}
                color="#8a8a8a"
                shineColor="#ffffff"
                className="font-medium"
              />
            ) : (
              <span
                className={cn(
                  'transition-colors duration-300',
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'running' && 'text-foreground',
                  step.status === 'done' && 'text-muted-foreground',
                  step.status === 'failed' && 'text-destructive'
                )}
              >
                {step.label}
              </span>
            )}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}

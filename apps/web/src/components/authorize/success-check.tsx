import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

interface SuccessCheckProps {
  className?: string
  label?: string
}

export function SuccessCheck({ className, label = 'Authorized' }: SuccessCheckProps) {
  const reduced = useReducedMotion()
  return (
    <div className={cn('flex flex-col items-center gap-3', className)} role="status" aria-live="polite">
      <motion.div
        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="relative flex size-16 items-center justify-center"
      >
        <motion.span
          initial={reduced ? false : { scale: 0.6, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-emerald-500/40"
        />
        <motion.svg
          viewBox="0 0 64 64"
          className="relative size-16"
          aria-hidden="true"
        >
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="rgb(16 185 129)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          />
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            fill="rgb(16 185 129)"
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.3, ease: 'easeOut' }}
            style={{ transformOrigin: '50% 50%' }}
          />
          <motion.path
            d="M20 33.5 L28.5 42 L44 24"
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.62, duration: 0.35, ease: 'easeOut' }}
          />
        </motion.svg>
      </motion.div>
      <motion.p
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="text-sm font-medium"
      >
        {label}
      </motion.p>
    </div>
  )
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { ShinyText } from '@/components/shiny-text'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'

export type SlideStatus = 'idle' | 'loading' | 'success'

interface SlideToAuthorizeProps {
  status: SlideStatus
  disabled?: boolean
  onComplete: () => void
  label?: string
}

const KNOB = 52
const PADDING = 4
const THRESHOLD = 0.82

export function SlideToAuthorize({
  status,
  disabled = false,
  onComplete,
  label = 'Slide to authorize',
}: SlideToAuthorizeProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [max, setMax] = useState(0)
  const [dragging, setDragging] = useState(false)
  const x = useMotionValue(0)
  const reduced = useReducedMotion()
  const progress = useTransform(x, [0, Math.max(max, 1)], [0, 1])
  const textOpacity = useTransform(progress, [0, 0.45], [1, 0])
  const fillWidth = useTransform(x, (value) => `${value + KNOB + PADDING}px`)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) {
      return
    }
    setMax(Math.max(0, track.offsetWidth - KNOB - PADDING * 2))
  }, [])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(() => {
    if (status === 'idle' && !dragging) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 32 })
    }
  }, [status, dragging, x])

  const locked = disabled || status !== 'idle'

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false)
    const reached = x.get() >= max * THRESHOLD || info.velocity.x > 900
    if (reached && max > 0) {
      animate(x, max, { type: 'spring', stiffness: 500, damping: 36 })
      onComplete()
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 32 })
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (locked) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight' || event.key === 'End') {
      event.preventDefault()
      animate(x, max, { duration: reduced ? 0 : 0.35, ease: 'easeOut' })
      onComplete()
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={status === 'idle' ? 0 : 100}
        aria-disabled={locked}
        tabIndex={locked ? -1 : 0}
        onKeyDown={onKeyDown}
        className={cn(
          'relative h-[60px] w-full select-none overflow-hidden rounded-full border bg-muted/60 shadow-inner outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring',
          disabled && status === 'idle' ? 'opacity-50' : ''
        )}
        style={{ touchAction: 'pan-y' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/10"
          style={{ width: fillWidth }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center pl-8"
          style={{ opacity: textOpacity }}
        >
          <ShinyText
            text={`${label}  > > >`}
            speed={2.2}
            delay={0.4}
            color="#8a8a8a"
            shineColor="#ffffff"
            className="text-sm font-medium tracking-wide"
          />
        </motion.div>
        <motion.div
          drag={locked ? false : 'x'}
          dragConstraints={{ left: 0, right: max }}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={() => setDragging(true)}
          onDragEnd={onDragEnd}
          style={{ x, width: KNOB, height: KNOB, top: PADDING, left: PADDING }}
          whileTap={locked ? undefined : { scale: 0.97 }}
          className={cn(
            'absolute flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md',
            locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          )}
        >
          {status === 'loading' ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ChevronRight className="size-6" />
          )}
        </motion.div>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Logo className="size-4" />
        Secured by Dokploy MCP
      </div>
    </div>
  )
}

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

type Step =
  | { kind: 'user'; text: string; duration: number }
  | { kind: 'thinking'; duration: number }
  | { kind: 'tool'; call: string; args?: string; results: string[]; duration: number }
  | { kind: 'text'; text: string; duration: number }

const PROMPT = 'Deploy the api service of the DokployMCP project and tell me when it’s live'

const SCRIPT: Step[] = [
  { kind: 'user', text: PROMPT, duration: 2200 },
  { kind: 'thinking', duration: 1400 },
  {
    kind: 'tool',
    call: 'dokploy - list_projects',
    results: ['Found 3 projects · DokployMCP → production: api, web'],
    duration: 1300,
  },
  {
    kind: 'tool',
    call: 'dokploy - service_action',
    args: 'service_type: "application", service_id: "Im1lxkb2…", action: "deploy"',
    results: ['Deployment started (running)'],
    duration: 1500,
  },
  {
    kind: 'tool',
    call: 'dokploy - list_deployments',
    args: 'service_type: "application", service_id: "Im1lxkb2…", limit: 1',
    results: ['running · feat(api): credentials endpoint', 'running · building image', 'done · finished in 41s'],
    duration: 3000,
  },
  {
    kind: 'tool',
    call: 'dokploy - deployment_logs',
    args: 'deployment_id: "bAlfuu16…", tail: 4',
    results: [
      '#8 [build 4/6] RUN npm ci',
      '#12 exporting layers 231.9MB done',
      '#13 naming to docker.io/library/dokploymcp-api:latest',
      'Deployment done ✓',
    ],
    duration: 2400,
  },
  {
    kind: 'text',
    text: 'Deployed. The api service is live at https://mcp.dokploy.rest (build 41s, image 231 MB). Health check passes.',
    duration: 2000,
  },
]

const HOLD = 4000
const STARTS = SCRIPT.reduce<number[]>((acc, _step, index) => {
  acc.push(index === 0 ? 0 : acc[index - 1] + SCRIPT[index - 1].duration)
  return acc
}, [])
const TOTAL = STARTS[STARTS.length - 1] + SCRIPT[SCRIPT.length - 1].duration
const TOOL_CALLS = SCRIPT.filter((step) => step.kind === 'tool').length

function typed(text: string, progress: number): string {
  return text.slice(0, Math.floor(text.length * Math.max(0, Math.min(1, progress))))
}

function Cursor({ style }: { style?: CSSProperties }) {
  return (
    <motion.span
      aria-hidden="true"
      className="ml-px inline-block w-[0.55em] bg-neutral-200 align-[-0.15em]"
      style={{ height: '1.05em', ...style }}
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear', times: [0, 0.5, 0.5, 1] }}
    />
  )
}

function Thinking({ done, seconds }: { done: boolean; seconds: number }) {
  if (done) {
    return <div className="text-neutral-500">{`✳ Thought for ${seconds}s`}</div>
  }
  return (
    <div className="flex items-center gap-1 text-neutral-400">
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        className="inline-block text-[#d97757]"
      >
        {'✳'}
      </motion.span>
      <span
        className="bg-[length:200%_100%] bg-clip-text text-transparent"
        style={{
          backgroundImage: 'linear-gradient(90deg, #6b6b6b 0%, #6b6b6b 35%, #f5f5f5 50%, #6b6b6b 65%, #6b6b6b 100%)',
          animation: 'dokploy-shine 1.6s linear infinite',
        }}
      >
        Thinking…
      </span>
    </div>
  )
}

function ToolBlock({
  step,
  elapsed,
}: {
  step: Extract<Step, { kind: 'tool' }>
  elapsed: number
}) {
  const perResult = step.duration / (step.results.length + 1)
  const shown = Math.min(step.results.length, Math.floor(elapsed / perResult))
  const pending = shown < step.results.length
  return (
    <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="flex items-start gap-2">
        <span className="text-[#d97757]">{'⏺'}</span>
        <span className="min-w-0">
          <span className="font-semibold text-neutral-100">{step.call}</span>
          <span className="text-neutral-400"> (MCP)</span>
          {step.args ? <span className="text-neutral-500">{`(${step.args})`}</span> : null}
        </span>
      </div>
      <div className="mt-0.5 pl-[1.1em] text-neutral-400">
        {step.results.slice(0, shown).map((line, index) => (
          <motion.div
            key={line}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2"
          >
            <span className="text-neutral-600">{index === 0 ? '⎿' : ' '}</span>
            <span className={cn(line.endsWith('✓') ? 'text-emerald-400' : '')}>{line}</span>
          </motion.div>
        ))}
        {pending ? (
          <div className="flex gap-2 text-neutral-600">
            <span>{shown === 0 ? '⎿' : ' '}</span>
            <span>Running…</span>
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

interface ClaudeCodeDemoProps {
  className?: string
  fontScale?: number
}

export function ClaudeCodeDemo({ className, fontScale = 1 / 58 }: ClaudeCodeDemoProps) {
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(12)
  const [visible, setVisible] = useState(false)
  const [time, setTime] = useState(reduced ? TOTAL : 0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) {
      return
    }
    const measure = () => setFontSize(Math.max(6.5, root.clientWidth * fontScale))
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(root)
    const observer = new IntersectionObserver((entries) => setVisible(entries.some((entry) => entry.isIntersecting)), {
      threshold: 0.2,
    })
    observer.observe(root)
    return () => {
      resize.disconnect()
      observer.disconnect()
    }
  }, [fontScale])

  useEffect(() => {
    if (reduced || !visible) {
      return
    }
    let frame = 0
    let last = performance.now()
    let current = time
    const tick = (now: number) => {
      current = (current + (now - last)) % (TOTAL + HOLD)
      last = now
      setTime(current)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced, visible])

  useEffect(() => {
    const box = scrollRef.current
    if (box) {
      box.scrollTop = box.scrollHeight
    }
  }, [time])

  const t = Math.min(time, TOTAL)
  const finished = time >= TOTAL
  const elapsedSeconds = Math.min(41, Math.round((t / TOTAL) * 41))

  return (
    <div
      ref={rootRef}
      className={cn('flex h-full w-full flex-col bg-[#0a0a0a] text-neutral-200', className)}
      style={{
        fontSize,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        lineHeight: 1.5,
      }}
    >
      <style>{'@keyframes dokploy-shine{from{background-position:150% center}to{background-position:-50% center}}'}</style>
      <div className="flex shrink-0 items-center gap-[0.5em] border-b border-white/5 px-[1em] py-[0.55em]">
        <span className="size-[0.7em] rounded-full bg-[#ff5f57]" />
        <span className="size-[0.7em] rounded-full bg-[#febc2e]" />
        <span className="size-[0.7em] rounded-full bg-[#28c840]" />
        <span className="ml-[0.6em] truncate text-[0.9em] text-neutral-500">claude — ~/projects/dokploy-mcp</span>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-hidden px-[1.2em] py-[0.9em]">
        <div className="mb-[0.8em] flex items-center gap-[0.6em] text-neutral-500">
          <span className="text-[#d97757]">{'✳'}</span>
          <span className="text-neutral-300">Claude Code</span>
          <span>v2.1 · model claude-opus-5 · mcp: dokploy</span>
        </div>
        <div className="rounded-[0.35em] border border-neutral-700/80 px-[0.8em] py-[0.45em]">
          <span className="text-neutral-500">{'> '}</span>
          <span className="text-neutral-100">{typed(PROMPT, t / SCRIPT[0].duration)}</span>
          {t < SCRIPT[0].duration ? <Cursor /> : null}
        </div>
        <div className="mt-[0.9em] space-y-[0.7em]">
          {SCRIPT.map((step, index) => {
            if (index === 0) {
              return null
            }
            const start = STARTS[index]
            if (t < start) {
              return null
            }
            const elapsed = t - start
            if (step.kind === 'thinking') {
              return <Thinking key={index} done={elapsed >= step.duration} seconds={Math.max(1, Math.round(step.duration / 1000))} />
            }
            if (step.kind === 'tool') {
              return <ToolBlock key={index} step={step} elapsed={elapsed} />
            }
            if (step.kind === 'text') {
              const progress = elapsed / (step.duration * 0.8)
              return (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-neutral-200">{'⏺'}</span>
                  <span className="text-neutral-100">
                    {typed(step.text, progress)}
                    {progress < 1 ? <Cursor /> : null}
                  </span>
                </div>
              )
            }
            return null
          })}
          {finished ? (
            <div className="rounded-[0.35em] border border-neutral-800 px-[0.8em] py-[0.45em] text-neutral-500">
              {'> '}
              <Cursor style={{ opacity: 0.6 }} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-white/5 px-[1em] py-[0.4em] text-[0.85em] text-neutral-500">
        <span>dokploy-mcp · {Math.min(TOOL_CALLS, SCRIPT.slice(0, STARTS.findIndex((s) => s > t) === -1 ? SCRIPT.length : STARTS.findIndex((s) => s > t)).filter((s) => s.kind === 'tool').length)} tool calls · {elapsedSeconds}s</span>
        <span>{finished ? 'idle' : 'working…'}</span>
      </div>
    </div>
  )
}

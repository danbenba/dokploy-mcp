import { shinyText } from './shimmer.js'
import { clearLine, hideCursor, isInteractive, showCursor, ui, visibleLength, width } from './theme.js'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const TICK = 70

export async function loadingIntro(title: string, duration = 1400): Promise<void> {
  if (!isInteractive) {
    return
  }
  await new Promise<void>((resolve) => {
    let frame = 0
    hideCursor()
    const draw = () => {
      const spinner = FRAMES[frame % FRAMES.length]
      const dots = '.'.repeat(frame % 4).padEnd(3, ' ')
      process.stdout.write(
        `\r\x1B[2K  ${ui.primary(spinner)} ${shinyText(title, frame, { shineWidth: 18, speed: 1.2 })} ${ui.muted(`Loading${dots}`)}`
      )
      frame += 1
    }
    draw()
    const interval = setInterval(draw, TICK)
    setTimeout(() => {
      clearInterval(interval)
      clearLine()
      showCursor()
      resolve()
    }, duration)
  })
}

export class Spinner {
  private frame = 0
  private interval: NodeJS.Timeout | null = null
  private active = false
  private label: string
  private detail: string

  constructor(label: string, detail = '') {
    this.label = label
    this.detail = detail
  }

  start(): this {
    this.active = true
    if (!isInteractive) {
      console.log(`  ${ui.primary('…')} ${this.label} ${ui.muted(this.detail)}`)
      return this
    }
    hideCursor()
    this.draw()
    this.interval = setInterval(() => {
      this.frame += 1
      this.draw()
    }, TICK)
    return this
  }

  update(detail: string): void {
    this.detail = detail
    if (!isInteractive) {
      console.log(`    ${ui.muted(detail)}`)
    }
  }

  log(message: string): void {
    if (this.active && isInteractive) {
      clearLine()
    }
    process.stdout.write(`${message}\n`)
    if (this.active && isInteractive) {
      this.draw()
    }
  }

  succeed(message: string): void {
    this.stop()
    console.log(`  ${ui.success('✓')} ${message}`)
  }

  fail(message: string): void {
    this.stop()
    console.log(`  ${ui.error('✗')} ${message}`)
  }

  stop(): void {
    if (!this.active) {
      return
    }
    this.active = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    if (isInteractive) {
      clearLine()
      showCursor()
    }
  }

  private draw(): void {
    if (!this.active) {
      return
    }
    const spinner = FRAMES[this.frame % FRAMES.length]
    const shimmer = shinyText(this.label, this.frame)
    const room = Math.max(10, width() - visibleLength(this.label) - 8)
    const detail = this.detail
      ? `  ${ui.muted(this.detail.length > room ? `${this.detail.slice(0, room - 1)}…` : this.detail)}`
      : ''
    process.stdout.write(`\r\x1B[2K  ${ui.primary(spinner)} ${shimmer}${detail}`)
  }
}

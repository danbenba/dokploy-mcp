import chalk from 'chalk'
import { THEME, clearLine, hideCursor, isInteractive, showCursor, ui, width } from './theme.js'

const TICK = 60

export class ProgressBar {
  private readonly total: number
  private readonly label: string
  private current = 0
  private shown = 0
  private detail = ''
  private interval: NodeJS.Timeout | null = null
  private active = false

  constructor(label: string, total: number) {
    this.label = label
    this.total = Math.max(1, total)
  }

  start(): this {
    this.active = true
    if (!isInteractive) {
      console.log(`  ${this.label}`)
      return this
    }
    hideCursor()
    this.draw()
    this.interval = setInterval(() => {
      if (this.shown < this.current) {
        this.shown = Math.min(this.current, this.shown + Math.max(0.5, (this.current - this.shown) / 4))
      }
      this.draw()
    }, TICK)
    return this
  }

  advance(detail = ''): void {
    this.current = Math.min(this.total, this.current + 1)
    this.detail = detail
    if (!isInteractive) {
      console.log(`    ${ui.muted(`${this.current}/${this.total}`)} ${detail}`)
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

  async finish(message?: string): Promise<void> {
    this.current = this.total
    if (isInteractive) {
      while (this.shown < this.total - 0.01) {
        this.shown = Math.min(this.total, this.shown + Math.max(0.5, (this.total - this.shown) / 3))
        this.draw()
        await new Promise((resolve) => setTimeout(resolve, TICK))
      }
      this.shown = this.total
      this.draw()
      await new Promise((resolve) => setTimeout(resolve, 180))
    }
    this.stop()
    if (message) {
      console.log(`  ${ui.success('✓')} ${message}`)
    }
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
    const ratio = Math.max(0, Math.min(1, this.shown / this.total))
    const barWidth = Math.max(12, Math.min(34, width() - 44))
    const filled = Math.round(ratio * barWidth)
    const head = filled > 0 && filled < barWidth ? 1 : 0
    const bar =
      chalk.hex(THEME.primary)('█'.repeat(Math.max(0, filled - head))) +
      (head ? chalk.hex(THEME.primarySoft)('▓') : '') +
      ui.border('░'.repeat(barWidth - filled))
    const percent = `${String(Math.round(ratio * 100)).padStart(3)}%`
    const counter = ui.muted(`${Math.min(this.total, Math.round(this.shown))}/${this.total}`)
    const room = Math.max(8, width() - barWidth - 30)
    const detail = this.detail
      ? ui.muted(this.detail.length > room ? `${this.detail.slice(0, room - 1)}…` : this.detail)
      : ''
    process.stdout.write(`\r\x1B[2K  ${ui.text(this.label)} ${bar} ${ui.primary(percent)} ${counter}  ${detail}`)
  }
}

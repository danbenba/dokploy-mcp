import chalk from 'chalk'
import { ui, visibleLength, width } from './theme.js'

function padRight(text: string, size: number): string {
  const missing = size - visibleLength(text)
  return missing > 0 ? text + ' '.repeat(missing) : text
}

export function boxWidth(): number {
  return Math.min(76, width() - 2)
}

export function boxTop(w: number): string {
  return `  ${ui.border('╭─')}${ui.border('─'.repeat(w - 4))}${ui.border('─╮')}`
}

export function boxBottom(w: number): string {
  return `  ${ui.border('╰─')}${ui.border('─'.repeat(w - 4))}${ui.border('─╯')}`
}

export function boxSeparator(w: number): string {
  return `  ${ui.border('├─')}${ui.border('─'.repeat(w - 4))}${ui.border('─┤')}`
}

export function boxLine(w: number, text = ''): string {
  return `  ${ui.border('│ ')}${padRight(text, w - 4)}${ui.border(' │')}`
}

export function boxRow(w: number, label: string, value: string): string {
  const inner = w - 4
  const head = `${chalk.bold(label)}: `
  const room = inner - visibleLength(head)
  const fitted = visibleLength(value) > room ? `${value.slice(0, Math.max(0, room - 1))}…` : value
  return boxLine(w, `${head}${ui.primary(fitted)}`)
}

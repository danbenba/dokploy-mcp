import chalk from 'chalk'

export const THEME = {
  background: '#0A0A0A',
  panel: '#141414',
  element: '#1E1E1E',
  border: '#484848',
  text: '#EEEEEE',
  muted: '#808080',
  primary: '#FAB283',
  primarySoft: '#FFC09F',
  secondary: '#5C9CF5',
  accent: '#9D7CD8',
  success: '#7FD88F',
  warning: '#F5A742',
  error: '#E06C75',
  info: '#56B6C2',
}

export const ui = {
  text: chalk.hex(THEME.text),
  muted: chalk.hex(THEME.muted),
  border: chalk.hex(THEME.border),
  primary: chalk.hex(THEME.primary),
  primarySoft: chalk.hex(THEME.primarySoft),
  secondary: chalk.hex(THEME.secondary),
  accent: chalk.hex(THEME.accent),
  success: chalk.hex(THEME.success),
  warning: chalk.hex(THEME.warning),
  error: chalk.hex(THEME.error),
  info: chalk.hex(THEME.info),
}

export const isInteractive = Boolean(process.stdout.isTTY && process.stdin.isTTY && !process.env.CI)

export function width(): number {
  return Math.max(40, process.stdout.columns ?? 80)
}

export function softGradient(text: string): string {
  const colors = [THEME.primary, THEME.primarySoft, THEME.text, THEME.primarySoft, THEME.primary]
  let cursor = 0
  return text
    .split('')
    .map((char) => {
      if (char === ' ') {
        return char
      }
      const color = colors[cursor % colors.length]
      cursor += 1
      return chalk.hex(color).bold(char)
    })
    .join('')
}

export function chip(label: string): string {
  return `${ui.border('[')}${ui.primary(label)}${ui.border(']')}`
}

export function hideCursor(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1B[?25l')
  }
}

export function showCursor(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1B[?25h')
  }
}

export function clearLine(): void {
  process.stdout.write('\r\x1B[2K')
}

export function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;?]*[A-Za-z]/g, '')
}

export function visibleLength(text: string): number {
  return stripAnsi(text).length
}

import { createInterface } from 'node:readline'
import { clearLine, hideCursor, isInteractive, showCursor, ui } from './theme.js'

export interface Choice<T> {
  label: string
  hint?: string
  value: T
  selected?: boolean
  disabled?: boolean
}

const ESC = '\u001b'
const CTRL_C = '\u0003'
const UP = `${ESC}[A`
const DOWN = `${ESC}[B`

function rawKeys(onKey: (key: string) => void): () => void {
  const stdin = process.stdin
  stdin.setRawMode?.(true)
  stdin.resume()
  stdin.setEncoding('utf8')
  const handler = (chunk: string) => onKey(chunk)
  stdin.on('data', handler)
  return () => {
    stdin.off('data', handler)
    stdin.setRawMode?.(false)
    stdin.pause()
  }
}

async function askLine(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export async function multiselect<T>(
  title: string,
  choices: Choice<T>[],
  footer = 'space toggle   enter confirm   a all   esc cancel'
): Promise<T[]> {
  const picked = choices.map((choice) => Boolean(choice.selected) && !choice.disabled)
  if (!isInteractive) {
    console.log(`\n  ${ui.text.bold(title)}`)
    choices.forEach((choice, index) => {
      console.log(
        `  [${index + 1}] ${picked[index] ? '◆' : '◇'} ${choice.label} ${ui.muted(choice.hint ?? '')}`
      )
    })
    const answer = await askLine('  > Numbers to install, comma separated (default: preselected): ')
    if (answer) {
      const wanted = new Set(answer.split(/[\s,]+/).map((item) => Number.parseInt(item, 10) - 1))
      return choices
        .filter((choice, index) => wanted.has(index) && !choice.disabled)
        .map((choice) => choice.value)
    }
    return choices.filter((_, index) => picked[index]).map((choice) => choice.value)
  }

  let cursor = choices.findIndex((choice) => !choice.disabled)
  if (cursor < 0) {
    cursor = 0
  }
  const lines = choices.length + 3
  let drawn = false

  const render = () => {
    if (drawn) {
      process.stdout.write(`${ESC}[${lines}A`)
    }
    drawn = true
    clearLine()
    process.stdout.write(`  ${ui.text.bold(title)}\n`)
    choices.forEach((choice, index) => {
      clearLine()
      const active = index === cursor
      const mark = choice.disabled
        ? ui.border('[-]')
        : picked[index]
          ? ui.primary('[✓]')
          : ui.border('[ ]')
      const pointer = active ? ui.primary('▌') : ' '
      const label = choice.disabled
        ? ui.muted(choice.label)
        : active
          ? ui.text.bold(choice.label)
          : ui.text(choice.label)
      const hint = choice.hint ? `  ${ui.muted(choice.hint)}` : ''
      process.stdout.write(`  ${pointer} ${mark} ${label}${hint}\n`)
    })
    clearLine()
    process.stdout.write('\n')
    clearLine()
    process.stdout.write(`  ${ui.muted(footer)}\n`)
  }

  const wipe = () => {
    process.stdout.write(`${ESC}[${lines}A`)
    for (let index = 0; index < lines; index += 1) {
      clearLine()
      process.stdout.write('\n')
    }
    process.stdout.write(`${ESC}[${lines}A`)
  }

  hideCursor()
  render()
  return new Promise((resolve, reject) => {
    const stop = rawKeys((key) => {
      if (key === ESC || key === CTRL_C) {
        stop()
        showCursor()
        reject(new Error('Cancelled.'))
        return
      }
      if (key === '\r' || key === '\n') {
        stop()
        showCursor()
        const selected = choices.filter((choice, index) => picked[index] && !choice.disabled)
        wipe()
        console.log(
          `  ${ui.success('✓')} ${ui.text.bold(title)}  ${ui.primary(
            selected.length ? selected.map((choice) => choice.label).join(', ') : 'none'
          )}`
        )
        resolve(selected.map((choice) => choice.value))
        return
      }
      if (key === UP || key === 'k') {
        do {
          cursor = (cursor - 1 + choices.length) % choices.length
        } while (choices[cursor].disabled)
      } else if (key === DOWN || key === 'j') {
        do {
          cursor = (cursor + 1) % choices.length
        } while (choices[cursor].disabled)
      } else if (key === ' ') {
        if (!choices[cursor].disabled) {
          picked[cursor] = !picked[cursor]
        }
      } else if (key === 'a') {
        const all = choices.every((choice, index) => choice.disabled || picked[index])
        choices.forEach((choice, index) => {
          if (!choice.disabled) {
            picked[index] = !all
          }
        })
      }
      render()
    })
  })
}

export async function confirm(question: string, fallback = true): Promise<boolean> {
  if (!isInteractive) {
    const answer = await askLine(`  > ${question} ${fallback ? '[Y/n]' : '[y/N]'} `)
    if (!answer) {
      return fallback
    }
    return /^y/i.test(answer)
  }
  process.stdout.write(`  ${ui.text.bold(question)} ${ui.muted(fallback ? '(Y/n)' : '(y/N)')} `)
  return new Promise((resolve, reject) => {
    const stop = rawKeys((key) => {
      if (key === ESC || key === CTRL_C) {
        stop()
        process.stdout.write('\n')
        reject(new Error('Cancelled.'))
        return
      }
      let value: boolean | null = null
      if (key === '\r' || key === '\n') {
        value = fallback
      } else if (/^y$/i.test(key)) {
        value = true
      } else if (/^n$/i.test(key)) {
        value = false
      }
      if (value === null) {
        return
      }
      stop()
      clearLine()
      console.log(`  ${ui.success('✓')} ${ui.text.bold(question)}  ${ui.primary(value ? 'yes' : 'no')}`)
      resolve(value)
    })
  })
}

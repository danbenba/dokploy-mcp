import chalk from 'chalk'

interface ShimmerOptions {
  baseColor?: string
  shineColor?: string
  shineWidth?: number
  speed?: number
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').padEnd(6, '0').slice(0, 6)
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  }
}

function mix(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  amount: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount),
  }
}

export function shinyText(text: string, frame: number, options: ShimmerOptions = {}): string {
  const base = hexToRgb(options.baseColor ?? '#969696')
  const shine = hexToRgb(options.shineColor ?? '#ffffff')
  const shineWidth = options.shineWidth ?? 6
  const speed = options.speed ?? 1
  const travel = text.length + shineWidth * 2
  const position = ((frame * speed) % travel) - shineWidth
  let result = ''
  for (let index = 0; index < text.length; index += 1) {
    const distance = Math.abs(index - position)
    const intensity = smoothstep(0, 1, 1 - Math.min(1, distance / shineWidth))
    const color = mix(base, shine, intensity)
    const paint =
      intensity > 0.82 ? chalk.rgb(color.r, color.g, color.b).bold : chalk.rgb(color.r, color.g, color.b)
    result += paint(text[index])
  }
  return result
}

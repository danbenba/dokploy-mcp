import { marked } from 'marked'

export interface Heading {
  id: string
  text: string
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

marked.use({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      const id = slugify(text)
      return `<h${depth}${id ? ` id="${id}"` : ''}>${text}</h${depth}>\n`
    },
  },
})

/** Documentation sources are part of this repository, never user input. */
export function render(markdown: string): string {
  const html = marked.parse(markdown, { async: false })
  // Wide reference tables need to scroll on their own rather than widen the column.
  return html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, '</table></div>')
}

/** The h2 headings, for the "On this page" rail. */
export function outline(markdown: string): Heading[] {
  const headings: Heading[] = []
  const lines = markdown.split('\n')
  let fenced = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      fenced = !fenced
      continue
    }
    if (fenced) {
      continue
    }
    const match = /^##\s+(.+?)\s*$/.exec(line)
    if (match) {
      const text = match[1].replace(/`/g, '')
      headings.push({ id: slugify(text), text })
    }
  }

  return headings
}

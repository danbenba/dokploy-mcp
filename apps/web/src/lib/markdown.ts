import { marked } from 'marked'

export interface Heading {
  id: string
  text: string
  depth: 2 | 3
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

export function render(markdown: string): string {
  const html = marked.parse(markdown, { async: false })
  return html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, '</table></div>')
}

export function outline(markdown: string): Heading[] {
  const headings: Heading[] = []
  let fenced = false

  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      fenced = !fenced
      continue
    }
    if (fenced) {
      continue
    }
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line)
    if (match) {
      const text = match[2].replace(/`/g, '')
      headings.push({ id: slugify(text), text, depth: match[1].length as 2 | 3 })
    }
  }

  return headings
}

import { useEffect, useMemo, useRef } from 'react'
import { render } from '@/lib/markdown'

interface ProseArticleProps {
  markdown: string
  onInternalLink?: (href: string) => void
}

export function ProseArticle({ markdown, onInternalLink }: ProseArticleProps) {
  const html = useMemo(() => render(markdown), [markdown])
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = root.current
    if (!container) {
      return
    }

    const cleanups: Array<() => void> = []

    for (const pre of container.querySelectorAll('pre')) {
      pre.classList.add('relative', 'group')

      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'Copy'
      button.setAttribute('aria-label', 'Copy the code block')
      button.className =
        'absolute top-2 right-2 rounded-md border bg-background/80 px-2 py-1 text-[0.6875rem] font-medium text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100'

      let timer = 0
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(pre.textContent ?? '')
          button.textContent = 'Copied'
        } catch {
          button.textContent = 'Press ⌘C'
        }
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          button.textContent = 'Copy'
        }, 1800)
      }

      button.addEventListener('click', onClick)
      pre.append(button)

      cleanups.push(() => {
        window.clearTimeout(timer)
        button.removeEventListener('click', onClick)
        button.remove()
      })
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
    }
  }, [html])

  useEffect(() => {
    const container = root.current
    if (!container || !onInternalLink) {
      return
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) {
        return
      }
      const anchor = (event.target as Element | null)?.closest('a')
      const href = anchor?.getAttribute('href')
      if (!href || !href.startsWith('/')) {
        return
      }
      event.preventDefault()
      onInternalLink(href)
    }

    container.addEventListener('click', onClick)
    return () => container.removeEventListener('click', onClick)
  }, [html, onInternalLink])

  return (
    <div
      ref={root}
      className="site-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { render } from '@/lib/markdown'

interface ProseArticleProps {
  markdown: string
  /**
   * Called for a click on a link to a path on this site, so the host can route it client-side
   * instead of reloading the page. Left out, such links behave like ordinary ones.
   */
  onInternalLink?: (href: string) => void
}

/**
 * Renders a Markdown document and gives every code block its own copy button.
 *
 * The button is attached to the DOM rather than composed in JSX because the body of a page is one
 * HTML string produced from Markdown at build time; injecting a node is simpler and cheaper than
 * hydrating the whole tree into components.
 */
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
      // Only site-relative paths; '#anchor', 'mailto:' and absolute URLs keep native behaviour.
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
      // The source is Markdown committed to this repository, never user input.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

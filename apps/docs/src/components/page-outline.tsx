import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Heading } from '@/lib/markdown'

/** Matches the heading scroll-margin, so a heading counts as current once it reaches the header. */
const ACTIVE_OFFSET = 96

/**
 * The "On this page" rail, with the section you are reading highlighted.
 *
 * The current heading is the last one whose top has passed the offset, read straight from
 * getBoundingClientRect on each scroll. An IntersectionObserver would need a rootMargin band that
 * reports nothing at all for a section taller than the viewport, which is most of them here.
 */
export function PageOutline({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(headings[0]?.id)

  useEffect(() => {
    if (headings.length === 0) {
      return
    }

    let frame = 0
    const update = () => {
      frame = 0
      let current = headings[0].id
      for (const heading of headings) {
        const element = document.getElementById(heading.id)
        if (!element) {
          continue
        }
        if (element.getBoundingClientRect().top <= ACTIVE_OFFSET) {
          current = heading.id
        } else {
          break
        }
      }
      // The last section is often too short to reach the offset; at the bottom it is the answer.
      if (window.scrollY + window.innerHeight >= document.body.scrollHeight - 2) {
        current = headings[headings.length - 1].id
      }
      setActiveId(current)
    }

    const onScroll = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [headings])

  if (headings.length === 0) {
    return null
  }

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="text-[0.6875rem] font-medium tracking-wider text-muted-foreground/80 uppercase">
        On this page
      </p>
      <ul className="mt-3 border-l">
        {headings.map((heading) => {
          const active = heading.id === activeId
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  '-ml-px block border-l py-1.5 text-pretty transition-colors',
                  heading.depth === 3 ? 'pl-7 text-[0.8125rem]' : 'pl-4',
                  active
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                )}
              >
                {heading.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

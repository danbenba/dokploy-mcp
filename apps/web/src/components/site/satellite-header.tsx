import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Container, type ContainerWidth } from '@/components/site/container'
import { GithubIcon } from '@/components/site/github-icon'
import { GITHUB_URL, WEB_URL } from '@/lib/site-links'

export interface NavItem {
  label: string
  href: string
  external?: boolean
}

interface SatelliteHeaderProps {
  /** Short badge next to the wordmark: which site this is. */
  tag: string
  nav: NavItem[]
  /** Supplied by sites that have a sidebar to fold away on small screens. */
  menu?: { open: boolean; onToggle: () => void }
  /** Must match the width the page content uses, or the header sits out of line with it. */
  width?: ContainerWidth
}

/**
 * The landing page's header, for the sites that orbit it: same height, same border, same blur,
 * same wordmark. Only the badge and the links change.
 */
export function SatelliteHeader({ tag, nav, menu, width }: SatelliteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <Container width={width} className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          {menu ? (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 lg:hidden"
              aria-label={menu.open ? 'Close the navigation' : 'Open the navigation'}
              aria-expanded={menu.open}
              onClick={menu.onToggle}
            >
              {menu.open ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          ) : null}
          <a href={WEB_URL} className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="text-sm font-medium">Dokploy MCP</span>
          </a>
          <span className="rounded-full border px-2 py-0.5 text-[0.6875rem] text-muted-foreground">
            {tag}
          </span>
        </div>
        <nav aria-label="Primary" className="flex items-center gap-1">
          {nav.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <a href={item.href} {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                {item.label}
              </a>
            </Button>
          ))}
          <Button variant="outline" size="sm" asChild>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <GithubIcon className="size-4" />
              GitHub
            </a>
          </Button>
        </nav>
      </Container>
    </header>
  )
}

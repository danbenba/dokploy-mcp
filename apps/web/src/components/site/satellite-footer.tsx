import { ArrowUpRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Container, type ContainerWidth } from '@/components/site/container'
import type { NavItem } from '@/components/site/satellite-header'
import {
  DOKPLOY_URL,
  GITHUB_URL,
  LEGAL_URL,
  LICENSE_URL,
  MCP_URL,
  PRIVACY_URL,
  WEB_URL,
} from '@/lib/site-links'

export interface FooterColumn {
  label: string
  items: NavItem[]
}

export function SatelliteFooter({
  columns,
  width,
}: {
  columns: FooterColumn[]
  width?: ContainerWidth
}) {
  return (
    <footer className="border-t">
      <Container width={width} className="grid gap-10 py-14 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <a href={WEB_URL} className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="text-sm font-medium">Dokploy MCP</span>
          </a>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground text-pretty">
            Connect Claude, ChatGPT or any MCP client to the Dokploy panel you host.
          </p>
        </div>

        {columns.map((column) => (
          <nav key={column.label} aria-label={column.label} className="text-sm">
            <p className="font-medium">{column.label}</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              {column.items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="hover:text-foreground"
                    {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <nav aria-label="Project" className="text-sm">
          <p className="font-medium">Project</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                GitHub <ArrowUpRight className="size-3.5" />
              </a>
            </li>
            <li>
              <a href={PRIVACY_URL} className="hover:text-foreground">
                Privacy
              </a>
            </li>
            <li>
              <a href={LICENSE_URL} className="hover:text-foreground">
                License
              </a>
            </li>
            <li>
              <a href={DOKPLOY_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
                Dokploy
              </a>
            </li>
          </ul>
        </nav>
      </Container>

      <Container width={width} className="flex flex-col gap-2 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Apache 2.0. Not affiliated with Dokploy Technology, Inc.{' '}
          <a href={LEGAL_URL} className="hover:text-foreground">
            Legal
          </a>
        </span>
        <span>{MCP_URL}</span>
      </Container>
    </footer>
  )
}

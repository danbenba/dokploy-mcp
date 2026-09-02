import type { ReactNode } from 'react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

interface OnboardingLayoutProps {
  children: ReactNode
  footer?: ReactNode
}

const GITHUB_URL = 'https://github.com/danbenba/dokploy-mcp'

export function OnboardingLayout({ children, footer }: OnboardingLayoutProps) {
  return (
    <div className="relative flex min-h-svh w-full flex-col px-4 sm:px-6">
      <header className="flex w-full items-center justify-between py-4">
        <a href="/" className="flex items-center gap-2 text-sm font-medium">
          <Logo className="size-7" />
          Dokploy MCP
        </a>
        <Button variant="ghost" size="icon" asChild>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="size-5" aria-hidden="true">
              <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
            </svg>
          </a>
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center space-y-6 py-6">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-md flex-col items-center gap-1.5 pb-6 text-center text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Logo className="size-4" />
          Dokploy MCP
        </span>
        {footer ? <span className="whitespace-nowrap">{footer}</span> : null}
      </footer>
    </div>
  )
}

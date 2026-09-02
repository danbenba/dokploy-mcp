import type { ReactNode } from 'react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

interface OnboardingLayoutProps {
  children: ReactNode
  leftPanel?: ReactNode
  centered?: boolean
}

const GITHUB_URL = 'https://github.com/danbenba/dokploy-mcp'

export function OnboardingLayout({ children, leftPanel, centered = false }: OnboardingLayoutProps) {
  if (centered) {
    return (
      <div className="relative mx-auto flex min-h-svh w-full flex-col items-center px-4">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center space-y-6 py-10">
          {children}
        </div>
        <div className="mx-auto flex w-full max-w-md items-center justify-center pb-6 text-xs text-muted-foreground">
          <a href="/" className="flex items-center gap-2 hover:text-foreground">
            <Logo className="size-5" />
            Dokploy MCP
          </a>
        </div>
      </div>
    )
  }
  return (
    <div className="container relative mx-auto flex min-h-svh w-full flex-col items-center justify-center px-4 lg:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col p-10 text-primary lg:flex dark:border-r">
        <div className="absolute inset-0 bg-muted" />
        <a
          href="/"
          className="relative z-20 flex items-center gap-4 text-lg font-medium text-primary"
        >
          <Logo className="size-10" />
          Dokploy MCP
        </a>
        <div className="relative z-20 mt-auto">
          {leftPanel ?? (
            <blockquote className="space-y-2">
              <p className="text-lg text-primary">
                &ldquo;Connect Claude to the Dokploy panel you already run.&rdquo;
              </p>
              <footer className="text-sm text-muted-foreground">
                Open source, self-hosted, and never a middleman for your credentials.
              </footer>
            </blockquote>
          )}
        </div>
      </div>

      <div className="flex min-h-svh w-full flex-col">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center space-y-6 py-8">
          {children}
        </div>
        <div className="mx-auto flex w-full max-w-lg items-center justify-center gap-1 pb-6 text-muted-foreground sm:justify-end">
          <Button variant="ghost" size="icon" asChild>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
                className="size-5"
                aria-hidden="true"
              >
                <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
              </svg>
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

import { ArrowUpRight, Boxes, KeyRound, Rocket, ScrollText, ShieldCheck, Terminal } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const MCP_URL = import.meta.env.VITE_MCP_URL ?? 'https://mcp.dokploy.rest'
const GITHUB_URL = 'https://github.com/danbenba/dokploy-mcp'

const CAPABILITIES = [
  {
    icon: Boxes,
    title: 'Your whole hierarchy',
    description:
      'Projects, environments, applications, compose stacks and the six database engines, exactly as Dokploy models them.',
  },
  {
    icon: Rocket,
    title: 'Deploy and expose',
    description:
      'Wire a git or docker source, pick a build, set environment variables, attach a domain with automatic TLS, then deploy.',
  },
  {
    icon: ScrollText,
    title: 'Read the real logs',
    description:
      'Build logs when a deployment fails, container logs when a service crashes, and docker inspect when neither explains it.',
  },
  {
    icon: ShieldCheck,
    title: 'Permissions you choose',
    description:
      'Read, deploy, create, delete and full API access are granted one by one on the consent screen, and enforced on every call.',
  },
]

const INSTALL_MODES = [
  {
    icon: KeyRound,
    title: 'Hosted connector',
    description: 'Add the URL below as a custom connector, then sign in to your own panel.',
    command: `${MCP_URL}/mcp`,
  },
  {
    icon: Terminal,
    title: 'npm package',
    description: 'Run it next to your assistant, authenticated by an API key you already own.',
    command: 'claude mcp add dokploy -- npx -y dokploy-mcp',
  },
  {
    icon: Boxes,
    title: 'Self-hosted',
    description: 'Deploy this server on your own infrastructure and keep every hop private.',
    command: 'docker run -p 3333:3333 ghcr.io/danbenba/dokploy-mcp',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo className="size-8" />
            <span className="text-base font-medium">Dokploy MCP</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              GitHub
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6">
        <section className="flex flex-col items-center gap-6 py-20 text-center">
          <Badge variant="secondary">Work in progress</Badge>
          <Logo className="size-20" />
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Let Claude run your Dokploy panel
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
            An open-source Model Context Protocol server that connects Claude or ChatGPT to the
            Dokploy instance you already host. Ask for a deployment, a database or the reason a build
            failed, in your own words.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                Read the documentation
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This project is under active development. Interfaces may still change.
          </p>
        </section>

        <Separator />

        <section className="grid gap-6 py-16 sm:grid-cols-2">
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className="rounded-lg border bg-card p-5">
              <capability.icon className="size-5 text-muted-foreground" />
              <h2 className="mt-3 text-sm font-medium">{capability.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{capability.description}</p>
            </div>
          ))}
        </section>

        <Separator />

        <section className="py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Three ways to connect</h2>
          <p className="mt-2 text-muted-foreground">
            The hosted connector never stores your panel credentials: it exchanges them for a
            scoped API key created on your own instance.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {INSTALL_MODES.map((mode) => (
              <div key={mode.title} className="flex flex-col rounded-lg border bg-card p-5">
                <mode.icon className="size-5 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-medium">{mode.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{mode.description}</p>
                <code className="mt-4 block overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
                  {mode.command}
                </code>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>Open source under the Apache 2.0 license.</span>
          <span>Not affiliated with Dokploy Technology, Inc.</span>
        </div>
      </footer>
    </div>
  )
}

import {
  ArrowUpRight,
  Boxes,
  KeyRound,
  ListChecks,
  LogIn,
  MoveRight,
  Package,
  PlugZap,
  Rocket,
  ScrollText,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Logo } from '@/components/logo'
import { ShinyText } from '@/components/shiny-text'
import { Reveal, Stagger, StaggerItem } from '@/components/landing/reveal'
import { CopyButton } from '@/components/landing/copy-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const MCP_URL = (import.meta.env.VITE_MCP_URL ?? 'https://mcp.dokploy.rest').replace(/\/+$/, '')
const GITHUB_URL = 'https://github.com/danbenba/dokploy-mcp'
const NPM_URL = 'https://www.npmjs.com/package/dokploy-rest'
const DOKPLOY_URL = 'https://dokploy.com'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  )
}

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
    title: 'Permissions and organizations you choose',
    description:
      'Read, deploy, create, delete and full API access are granted one by one on the consent screen, for any combination of your organizations, and enforced on every call.',
  },
]

const INSTALL_MODES = [
  {
    icon: KeyRound,
    title: 'Hosted connector',
    description: 'Add the URL below as a custom connector, then sign in to your own panel.',
    command: MCP_URL,
  },
  {
    icon: Terminal,
    title: 'npm package',
    description:
      'Run it next to your assistant, authenticated by API keys you already own. Published on npm as dokploy-rest.',
    command: 'claude mcp add dokploy -- npx -y dokploy-rest',
  },
  {
    icon: Boxes,
    title: 'Self-hosted',
    description: 'Deploy this server on your own infrastructure and keep every hop private.',
    command: 'docker run -p 3333:3333 ghcr.io/danbenba/dokploy-mcp',
  },
]

const STEPS = [
  { icon: PlugZap, title: 'Add the connector', description: 'Paste the URL in Claude or ChatGPT.' },
  { icon: LogIn, title: 'Sign in to your own panel', description: 'Credentials go to your Dokploy only.' },
  {
    icon: ListChecks,
    title: 'Pick organizations and permissions',
    description: 'One scoped API key is created per organization.',
  },
  { icon: MoveRight, title: 'Slide to authorize', description: 'You are back in the assistant.' },
]

const STACK = [
  { name: 'AdonisJS', href: 'https://adonisjs.com' },
  { name: 'React', href: 'https://react.dev' },
  { name: 'Vite', href: 'https://vite.dev' },
  { name: 'Tailwind CSS', href: 'https://tailwindcss.com' },
  { name: 'shadcn/ui', href: 'https://ui.shadcn.com' },
  { name: 'Radix UI', href: 'https://www.radix-ui.com' },
  { name: 'lucide-react', href: 'https://lucide.dev' },
  { name: 'Motion', href: 'https://motion.dev' },
  { name: 'React Bits', href: 'https://reactbits.dev' },
  { name: 'MCP SDK', href: 'https://modelcontextprotocol.io' },
  { name: 'jose', href: 'https://github.com/panva/jose' },
  { name: 'zod', href: 'https://zod.dev' },
]

function Hero() {
  const reduced = useReducedMotion()
  const enter = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <section className="relative flex flex-col items-center gap-6 py-20 text-center sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-3xl rounded-full bg-primary/10 blur-3xl"
      />
      <motion.div {...enter(0)}>
        <Badge variant="secondary">Open source · Apache 2.0</Badge>
      </motion.div>
      <motion.div {...enter(0.05)}>
        <Logo className="size-20" />
      </motion.div>
      <motion.h1
        {...enter(0.1)}
        className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
      >
        Let Claude run your Dokploy panel
      </motion.h1>
      <motion.p {...enter(0.15)} className="max-w-2xl text-lg text-muted-foreground text-pretty">
        An open-source Model Context Protocol server that connects Claude or ChatGPT to the Dokploy
        instance you already host. Ask for a deployment, a database or the reason a build failed,
        in your own words.
      </motion.p>
      <motion.div
        {...enter(0.2)}
        className="flex w-full max-w-xl flex-col items-stretch gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border bg-card pl-3 pr-1 text-left">
          <PlugZap className="size-4 shrink-0 text-muted-foreground" />
          <code className="min-w-0 flex-1 truncate py-2 text-sm">{MCP_URL}</code>
          <CopyButton value={MCP_URL} size="sm" aria-label="Copy the connector URL" />
        </div>
        <CopyButton value={MCP_URL} label="Add to Claude" size="lg" className="shrink-0" />
      </motion.div>
      <motion.div {...enter(0.25)} className="flex flex-col items-center gap-2 sm:flex-row">
        <Button variant="outline" size="sm" asChild>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <GithubIcon className="size-4" />
            Read the documentation
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={NPM_URL} target="_blank" rel="noreferrer">
            <Package className="size-4" />
            npx -y dokploy-rest
          </a>
        </Button>
      </motion.div>
      <motion.p {...enter(0.3)} className="text-xs">
        <ShinyText
          text="Paste the URL as a custom connector, sign in to your panel, slide to authorize > > >"
          speed={3}
          delay={1}
          color="#8a8a8a"
          shineColor="#f5f5f5"
        />
      </motion.p>
    </section>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-svh overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <Logo className="size-8" />
            <span className="text-base font-medium">Dokploy MCP</span>
          </a>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href={NPM_URL} target="_blank" rel="noreferrer">
                npm
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                GitHub
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6">
        <Hero />

        <Separator />

        <section className="py-16">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight">What the assistant can do</h2>
            <p className="mt-2 text-muted-foreground">
              Every tool speaks Dokploy's own HTTP API, with the permissions you granted and
              nothing more.
            </p>
          </Reveal>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((capability) => (
              <StaggerItem
                key={capability.title}
                lift
                className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <capability.icon className="size-5 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-medium">{capability.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{capability.description}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <Separator />

        <section className="py-16">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-2 text-muted-foreground">
              Four steps, under a minute, and your password never leaves your own panel.
            </p>
          </Reveal>
          <Stagger className="mt-8 grid gap-4 md:grid-cols-4" gap={0.1}>
            {STEPS.map((step, index) => (
              <StaggerItem key={step.title} className="relative rounded-lg border bg-card p-5">
                <span className="absolute right-4 top-4 text-xs font-medium text-muted-foreground">
                  0{index + 1}
                </span>
                <step.icon className="size-5 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-medium">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <Separator />

        <section className="py-16">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight">Three ways to connect</h2>
            <p className="mt-2 text-muted-foreground">
              The hosted connector never stores your panel credentials: it exchanges them for a
              scoped API key created on your own instance, one per organization you select.
            </p>
          </Reveal>
          <Stagger className="mt-8 grid gap-4 lg:grid-cols-3">
            {INSTALL_MODES.map((mode) => (
              <StaggerItem
                key={mode.title}
                lift
                className="flex flex-col rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <mode.icon className="size-5 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-medium">{mode.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{mode.description}</p>
                <div className="mt-4 flex items-center gap-1 rounded-md bg-muted pl-3 pr-1">
                  <code className="min-w-0 flex-1 overflow-x-auto py-2 text-xs whitespace-nowrap">
                    {mode.command}
                  </code>
                  <CopyButton value={mode.command} size="sm" aria-label={`Copy ${mode.title}`} />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <Separator />

        <section className="py-16">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight">Credits</h2>
            <p className="mt-2 text-muted-foreground">
              Built by{' '}
              <a
                href="https://github.com/danbenba"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Dany (danbenba)
              </a>{' '}
              at Dany Studio.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-medium">Dokploy</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                <a
                  href={DOKPLOY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  Dokploy
                </a>{' '}
                is made by Dokploy Technology, Inc. This project is an independent, community
                integration and is not affiliated with or endorsed by Dokploy.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-medium">Trademarks</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Claude is a trademark of Anthropic, ChatGPT of OpenAI. Their logos are shown only
                to identify the assistants that can use this connector.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.15} className="mt-4 rounded-lg border bg-card p-5">
            <h3 className="text-sm font-medium">Built with</h3>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {STACK.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>Open source under the Apache 2.0 license. Not affiliated with Dokploy Technology, Inc.</span>
          <nav className="flex items-center gap-4">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </a>
            <a href={NPM_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
              npm
            </a>
            <a href={DOKPLOY_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
              Dokploy
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

import type { ReactNode } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import claudeMark from '@/assets/brands/claude.svg'
import openaiMark from '@/assets/brands/openai.svg'
import { Logo } from '@/components/logo'
import { Reveal, Stagger, StaggerItem } from '@/components/landing/reveal'
import { MacbookPro } from '@/components/landing/macbook-pro'
import { ClaudeCodeDemo } from '@/components/landing/claude-code-demo'
import { CopyButton } from '@/components/landing/copy-button'
import { AddToButton } from '@/components/landing/add-to-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MCP_URL = (import.meta.env.VITE_MCP_URL ?? 'https://mcp.dokploy.rest').replace(/\/+$/, '')
const GITHUB_URL = 'https://github.com/danbenba/dokploy-mcp'
const NPM_URL = 'https://www.npmjs.com/package/dokploy-rest'
const DOKPLOY_URL = 'https://dokploy.com'
const REGISTRY_URL = 'https://registry.modelcontextprotocol.io'
const NPX_COMMAND = 'npx -y dokploy-rest'
const CLAUDE_CODE_COMMAND =
  'claude mcp add dokploy -e DOKPLOY_URL=https://panel.example.com -e DOKPLOY_API_KEY=your-key -- npx -y dokploy-rest'
const DOCKER_COMMAND = 'docker compose up -d'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  )
}

interface Exchange {
  prompt: string
  actions: string[]
  outcome: string
}

const FEATURES: Array<{
  eyebrow: string
  title: string
  body: string
  exchange: Exchange
}> = [
  {
    eyebrow: 'Deploy',
    title: 'From a repository to a live domain in one request.',
    body: 'Projects, environments, git or docker sources, build settings, environment variables and domains with automatic TLS. The assistant follows the same steps you would take in the panel, in the right order.',
    exchange: {
      prompt: 'Deploy the api service from GitHub to api.example.com',
      actions: ['create_application', 'configure_app_source', 'add_domain', 'service_action deploy'],
      outcome: 'api.example.com is live with a Let’s Encrypt certificate.',
    },
  },
  {
    eyebrow: 'Debug',
    title: 'The real logs, not a guess about them.',
    body: 'Build logs when a deployment fails, container logs when a service crashes, docker inspect when neither explains it. Five playbooks encode how Dokploy actually behaves so the diagnosis starts in the right place.',
    exchange: {
      prompt: 'Why is the checkout service returning 502?',
      actions: ['list_deployments', 'deployment_logs', 'get_application'],
      outcome: 'The domain targets port 3000 but the container listens on 8080.',
    },
  },
  {
    eyebrow: 'Control',
    title: 'Permissions and organizations you choose.',
    body: 'Read, deploy, create, delete and full API access are granted one by one when you connect, for any combination of your organizations. Tools outside the grant are not even listed, and every call is checked again.',
    exchange: {
      prompt: 'Delete the staging project',
      actions: ['delete_project'],
      outcome: 'Refused: this connection was granted read and deploy only.',
    },
  },
]

const STEPS = [
  { title: 'Add the connector', body: 'Paste the URL into Claude, ChatGPT or your editor.' },
  { title: 'Sign in to your own panel', body: 'Your credentials go to your Dokploy instance and nowhere else.' },
  { title: 'Choose what to grant', body: 'Organizations and permissions, one scoped API key per organization.' },
  { title: 'Slide to authorize', body: 'You are back in the assistant, connected.' },
]

const PATHS = [
  {
    name: 'Hosted connector',
    tagline: 'No key to paste, nothing to run.',
    rows: ['Sign in on dokploy.rest', 'OAuth 2.1 with PKCE', 'Claude, ChatGPT and any remote MCP client'],
    command: MCP_URL,
  },
  {
    name: 'npm package',
    tagline: 'Runs next to your assistant.',
    rows: ['API keys you already own', 'stdio transport, one key per organization', 'Claude Code, Claude Desktop, Cursor, Windsurf, Zed'],
    command: NPX_COMMAND,
  },
  {
    name: 'Self-hosted',
    tagline: 'Every hop stays on your infrastructure.',
    rows: ['Same server, your domain', 'Optionally locked to one panel', 'Docker Compose or the images'],
    command: DOCKER_COMMAND,
  },
]

const FAQ = [
  {
    q: 'Does the connector store my Dokploy password?',
    a: 'No. Your password is sent once to the panel you named, exchanged for an API key created on that panel, and never kept. Tokens are encrypted and carry the connection themselves; there is no database.',
  },
  {
    q: 'Which assistants and editors are supported?',
    a: 'Any client that speaks the Model Context Protocol. The hosted connector works with Claude and ChatGPT. The npm package works with Claude Code, Claude Desktop, Cursor, Windsurf, VS Code, Zed and other stdio clients.',
  },
  {
    q: 'Can I limit what the assistant is allowed to do?',
    a: 'Yes. Permissions are chosen when you connect: read, deploy, create, delete and full API access. Destructive tools also require an explicit confirmation.',
  },
  {
    q: 'How do I revoke access?',
    a: 'Delete the API key in your Dokploy panel under Settings, then API Keys. The connection stops working immediately.',
  },
  {
    q: 'Is it affiliated with Dokploy?',
    a: 'No. Dokploy MCP is an independent, open-source integration released under the Apache 2.0 license. Dokploy is made by Dokploy Technology, Inc.',
  },
]

function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1100px] px-6', className)}>{children}</div>
}

function SectionTitle({
  id,
  eyebrow,
  title,
  body,
}: {
  id?: string
  eyebrow?: string
  title: string
  body?: string
}) {
  return (
    <Reveal className="max-w-2xl">
      {eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
      <h2 id={id} className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {body ? <p className="mt-4 text-lg text-muted-foreground text-pretty">{body}</p> : null}
    </Reveal>
  )
}

function Command({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/40 pl-3 pr-1">
      <code className="min-w-0 flex-1 overflow-x-auto py-2 text-xs whitespace-nowrap">{value}</code>
      <CopyButton value={value} size="sm" aria-label={`Copy ${label}`} />
    </div>
  )
}

function ExchangePanel({ exchange }: { exchange: Exchange }) {
  return (
    <div className="rounded-xl border bg-card p-5 text-sm shadow-sm">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-primary-foreground">
          {exchange.prompt}
        </p>
      </div>
      <ul className="mt-4 space-y-1.5">
        {exchange.actions.map((action) => (
          <li key={action} className="flex items-center gap-2 text-muted-foreground">
            <Check className="size-3.5 shrink-0" />
            <code className="text-xs">{action}</code>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-pretty">{exchange.outcome}</p>
    </div>
  )
}

function Hero() {
  return (
    <section className="pt-20 pb-16 sm:pt-28 sm:pb-24">
      <Container className="flex flex-col items-center text-center">
        <Reveal>
          <Logo className="size-16" />
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-8 max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            Let Claude run your Dokploy panel.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty sm:text-xl">
            An open-source MCP server for the Dokploy instance you already host. Ask for a
            deployment, a database or the reason a build failed, in your own words.
          </p>
        </Reveal>
        <Reveal delay={0.15} className="mt-10 flex w-full max-w-xl flex-col items-center gap-4">
          <div className="flex h-11 w-full items-center gap-1 rounded-lg border bg-card pl-4 pr-1 text-left shadow-sm">
            <code className="min-w-0 flex-1 truncate text-sm">{MCP_URL}</code>
            <CopyButton value={MCP_URL} aria-label="Copy the connector URL" />
          </div>
          <AddToButton connectorUrl={MCP_URL} />
        </Reveal>
        <Reveal delay={0.2} className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <img src={claudeMark} alt="" width={16} height={16} className="size-4" />
            Claude
          </span>
          <span className="flex items-center gap-2">
            <img src={openaiMark} alt="" width={16} height={16} className="size-4 dark:invert" />
            ChatGPT
          </span>
          <span>Cursor</span>
          <span>VS Code</span>
          <span>Any MCP client</span>
        </Reveal>
      </Container>
    </section>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <Container className="flex h-14 items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="text-sm font-medium">Dokploy MCP</span>
          </a>
          <nav aria-label="Primary" className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="#connect">Connect</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#faq">FAQ</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={NPM_URL} target="_blank" rel="noreferrer">
                npm
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <GithubIcon className="size-4" />
                GitHub
              </a>
            </Button>
          </nav>
        </Container>
      </header>

      <main>
        <Hero />

        <section className="border-t py-20 sm:py-28" aria-labelledby="demo">
          <Container>
            <SectionTitle id="demo"
              eyebrow="Watch it work"
              title="One sentence in Claude Code. A deployment on your panel."
              body="A real session: Claude lists your projects, triggers the deploy, follows the build and reports back, all through Dokploy MCP."
            />
            <Reveal delay={0.1} y={24} className="mx-auto mt-12 hidden w-full max-w-[900px] min-[480px]:block">
              <MacbookPro>
                <ClaudeCodeDemo />
              </MacbookPro>
            </Reveal>
            <Reveal delay={0.1} className="mt-10 overflow-hidden rounded-xl border border-neutral-800 min-[480px]:hidden">
              <div className="h-[420px]">
                <ClaudeCodeDemo fontScale={1 / 34} />
              </div>
            </Reveal>
          </Container>
        </section>

        <section className="border-t py-20 sm:py-28" aria-labelledby="features">
          <Container>
            <SectionTitle id="features"
              eyebrow="What you can ask"
              title="Everything the panel does, in a sentence."
              body="The assistant works through Dokploy’s own HTTP API, with the permissions you granted and nothing more."
            />
            <div className="mt-16 space-y-20">
              {FEATURES.map((feature, index) => (
                <Reveal
                  key={feature.title}
                  className={cn(
                    'grid items-center gap-10 lg:grid-cols-2 lg:gap-16',
                    index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{feature.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="mt-4 text-muted-foreground text-pretty">{feature.body}</p>
                  </div>
                  <ExchangePanel exchange={feature.exchange} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        <section className="border-t bg-muted/30 py-20 sm:py-28" aria-labelledby="how">
          <Container>
            <SectionTitle id="how"
              eyebrow="How it works"
              title="Under a minute, and your password never leaves your panel."
            />
            <Stagger className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4" gap={0.1}>
              {STEPS.map((step, index) => (
                <StaggerItem key={step.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-medium tabular-nums">
                      {index + 1}
                    </span>
                    <span aria-hidden="true" className="hidden h-px flex-1 bg-border lg:block" />
                  </div>
                  <h3 className="mt-4 text-base font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">{step.body}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </section>

        <section id="connect" className="border-t py-20 sm:py-28" aria-labelledby="connect-title">
          <Container>
            <SectionTitle id="connect-title"
              eyebrow="Three ways to connect"
              title="Hosted, local or yours."
              body="The hosted connector exchanges your sign-in for scoped API keys created on your own instance. The npm package and the self-hosted server give you the same tools with the keys you manage."
            />
            <Stagger className="mt-14 grid gap-6 lg:grid-cols-3">
              {PATHS.map((path) => (
                <StaggerItem key={path.name} className="flex flex-col rounded-xl border bg-card p-6">
                  <h3 className="text-lg font-medium">{path.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{path.tagline}</p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm">
                    {path.rows.map((row) => (
                      <li key={row} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="text-pretty">{row}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Command value={path.command} label={path.name} />
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
            <Reveal className="mt-8 rounded-xl border bg-card p-6">
              <p className="text-sm font-medium">Claude Code, in one line</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate an API key in your panel under Settings, then API Keys, and register the
                server. Several keys separated by commas reach several organizations.
              </p>
              <div className="mt-4">
                <Command value={CLAUDE_CODE_COMMAND} label="the Claude Code command" />
              </div>
            </Reveal>
          </Container>
        </section>

        <section id="faq" className="border-t bg-muted/30 py-20 sm:py-28" aria-labelledby="faq-title">
          <Container className="grid gap-12 lg:grid-cols-[1fr_2fr]">
            <SectionTitle id="faq-title" eyebrow="FAQ" title="Questions, answered." />
            <Reveal delay={0.1}>
              <dl className="divide-y rounded-xl border bg-card">
                {FAQ.map((item) => (
                  <details key={item.q} className="group px-6 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                      <dt>{item.q}</dt>
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <dd className="mt-3 text-sm text-muted-foreground text-pretty">{item.a}</dd>
                  </details>
                ))}
              </dl>
            </Reveal>
          </Container>
        </section>

        <section className="border-t py-16" aria-labelledby="credits">
          <Container className="grid gap-8 text-sm text-muted-foreground sm:grid-cols-3">
            <div>
              <h2 id="credits" className="text-sm font-medium text-foreground">
                Credits
              </h2>
              <p className="mt-2 text-pretty">
                Built by{' '}
                <a href="https://github.com/danbenba" target="_blank" rel="noreferrer" className="text-foreground underline-offset-4 hover:underline">
                  Dany (danbenba)
                </a>{' '}
                at Dany Studio. Open source under the Apache 2.0 license.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Trademarks</h3>
              <p className="mt-2 text-pretty">
                Dokploy is made by Dokploy Technology, Inc.; this project is not affiliated with or
                endorsed by Dokploy. Claude is a trademark of Anthropic, ChatGPT of OpenAI.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Built with</h3>
              <p className="mt-2 text-pretty">
                AdonisJS, React, Vite, Tailwind CSS, shadcn/ui, Radix UI, Motion, React Bits and the
                Model Context Protocol SDK.
              </p>
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t">
        <Container className="grid gap-10 py-14 sm:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <a href="/" className="flex items-center gap-2.5">
              <Logo className="size-7" />
              <span className="text-sm font-medium">Dokploy MCP</span>
            </a>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground text-pretty">
              Connect Claude, ChatGPT or any MCP client to the Dokploy panel you host.
            </p>
          </div>
          <nav aria-label="Product" className="text-sm">
            <p className="font-medium">Product</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li><a href="#connect" className="hover:text-foreground">Connect</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              <li><a href={NPM_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">npm package</a></li>
            </ul>
          </nav>
          <nav aria-label="Resources" className="text-sm">
            <p className="font-medium">Resources</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li><a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">Documentation</a></li>
              <li><a href={REGISTRY_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">MCP registry</a></li>
              <li><a href="/llms.txt" className="hover:text-foreground">llms.txt</a></li>
            </ul>
          </nav>
          <nav aria-label="Project" className="text-sm">
            <p className="font-medium">Project</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li><a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">GitHub <ArrowUpRight className="size-3.5" /></a></li>
              <li><a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer" className="hover:text-foreground">Issues</a></li>
              <li><a href={DOKPLOY_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">Dokploy</a></li>
            </ul>
          </nav>
        </Container>
        <Container className="flex flex-col gap-2 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Apache 2.0. Not affiliated with Dokploy Technology, Inc.</span>
          <span>{MCP_URL}</span>
        </Container>
      </footer>
    </div>
  )
}

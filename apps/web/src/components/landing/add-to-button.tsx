import { useEffect, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { Check, ChevronDown, Copy, ExternalLink } from 'lucide-react'
import claudeMark from '@/assets/brands/claude.svg'
import openaiMark from '@/assets/brands/openai.svg'
import { cn } from '@/lib/utils'

type Target = 'claude' | 'chatgpt' | 'cursor' | 'vscode' | 'windsurf' | 'other'

interface AddToButtonProps {
  connectorUrl: string
  className?: string
}

const TARGETS: Array<{ id: Target; label: string; hint: string }> = [
  { id: 'claude', label: 'Claude', hint: 'Copies the URL and opens the connector settings' },
  { id: 'chatgpt', label: 'ChatGPT', hint: 'Copies the URL and opens ChatGPT' },
  { id: 'cursor', label: 'Cursor', hint: 'Installs in one click' },
  { id: 'vscode', label: 'VS Code', hint: 'Installs in one click' },
  { id: 'windsurf', label: 'Windsurf', hint: 'Copies the URL for your mcp_config.json' },
  { id: 'other', label: 'Other MCP client', hint: 'Copies the URL' },
]

function cursorLink(url: string): string {
  const config = btoa(JSON.stringify({ url: `${url}/mcp` }))
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=dokploy&config=${config}`
}

function vscodeLink(url: string): string {
  return `vscode:mcp/install?${encodeURIComponent(
    JSON.stringify({ name: 'dokploy', type: 'http', url: `${url}/mcp` })
  )}`
}

async function copy(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function AddToButton({ connectorUrl, className }: AddToButtonProps) {
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const run = async (target: Target) => {
    if (target === 'cursor') {
      window.location.href = cursorLink(connectorUrl)
      setNotice('Opening Cursor')
      return
    }
    if (target === 'vscode') {
      window.location.href = vscodeLink(connectorUrl)
      setNotice('Opening VS Code')
      return
    }
    const copied = await copy(connectorUrl)
    if (target === 'claude') {
      window.open('https://claude.ai/customize/connectors', '_blank', 'noopener')
      setNotice(copied ? 'URL copied. Paste it as a custom connector in Claude.' : 'Open Claude and add the URL as a custom connector.')
      return
    }
    if (target === 'chatgpt') {
      window.open('https://chatgpt.com/', '_blank', 'noopener')
      setNotice(copied ? 'URL copied. Add it as a connector in ChatGPT settings.' : 'Add the URL as a connector in ChatGPT settings.')
      return
    }
    setNotice(copied ? 'URL copied.' : connectorUrl)
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="inline-flex h-11 items-stretch overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-sm">
        <button
          type="button"
          onClick={() => run('claude')}
          className="inline-flex items-center gap-2 px-4 text-sm font-medium transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <img src={claudeMark} alt="" width={16} height={16} className="size-4" />
          Add to Claude
        </button>
        <span aria-hidden="true" className="w-px bg-primary-foreground/25" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Add to another assistant"
              className="inline-flex items-center px-2.5 transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=open]:bg-primary/85"
            >
              <ChevronDown className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-64 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted-foreground">
                Add to
              </DropdownMenu.Label>
              {TARGETS.map((target) => (
                <DropdownMenu.Item
                  key={target.id}
                  onSelect={() => void run(target.id)}
                  className="flex cursor-default items-center gap-3 rounded-md px-2 py-2 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <span className="flex size-6 items-center justify-center rounded-md border bg-background">
                    {target.id === 'claude' ? (
                      <img src={claudeMark} alt="" width={14} height={14} className="size-3.5" />
                    ) : target.id === 'chatgpt' ? (
                      <img src={openaiMark} alt="" width={14} height={14} className="size-3.5 dark:invert" />
                    ) : target.id === 'cursor' || target.id === 'vscode' ? (
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                    ) : (
                      <Copy className="size-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{target.label}</span>
                    <span className="block text-xs text-muted-foreground">{target.hint}</span>
                  </span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <p aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
        {notice ? (
          <>
            <Check className="size-3.5" />
            {notice}
          </>
        ) : null}
      </p>
    </div>
  )
}

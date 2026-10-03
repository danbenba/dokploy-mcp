const sources = import.meta.glob('../content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface DocPage {
  slug: string
  title: string
  description: string
  markdown: string
}

export interface DocGroup {
  label: string
  pages: DocPage[]
}

interface PageMeta {
  slug: string
  title: string
  description: string
}

const GROUPS: Array<{ label: string; pages: PageMeta[] }> = [
  {
    label: 'Getting started',
    pages: [
      {
        slug: 'introduction',
        title: 'Introduction',
        description:
          'An open-source MCP server that gives your assistant control of the Dokploy panel you host yourself.',
      },
      {
        slug: 'quickstart',
        title: 'Quickstart',
        description: 'Connect an assistant to your own panel in about a minute.',
      },
    ],
  },
  {
    label: 'Connect',
    pages: [
      {
        slug: 'hosted-connector',
        title: 'Hosted connector',
        description: 'One URL, OAuth 2.1, no API key to paste. The shortest path.',
      },
      {
        slug: 'npm-package',
        title: 'npm package',
        description: 'The same tools over stdio, next to your assistant, with a key you already own.',
      },
      {
        slug: 'self-hosting',
        title: 'Self-hosting',
        description: 'Run the same server on your own infrastructure, with every hop staying yours.',
      },
    ],
  },
  {
    label: 'Reference',
    pages: [
      {
        slug: 'tools',
        title: 'Tool reference',
        description: 'The fifty curated tools, the two meta tools, and the scope each one needs.',
      },
      {
        slug: 'permissions',
        title: 'Permissions',
        description: 'Five scopes, chosen when you connect and enforced twice.',
      },
      {
        slug: 'playbooks',
        title: 'Playbooks',
        description: "Five playbooks that encode how Dokploy actually behaves, so the assistant does not guess.",
      },
      {
        slug: 'cli',
        title: 'CLI reference',
        description: 'Every command, flag and environment variable of the dokploy-rest package.',
      },
    ],
  },
  {
    label: 'Under the hood',
    pages: [
      {
        slug: 'authorization',
        title: 'Authorization flow',
        description: 'A full OAuth 2.1 server: discovery, dynamic registration, PKCE and encrypted tokens.',
      },
      {
        slug: 'security',
        title: 'Security model',
        description: 'What the service refuses to do, and what is still on you.',
      },
    ],
  },
  {
    label: 'Help',
    pages: [
      {
        slug: 'troubleshooting',
        title: 'Troubleshooting',
        description: 'The failures that come up most, and where the answer actually lives.',
      },
    ],
  },
]

function markdownFor(slug: string): string {
  const key = `../content/${slug}.md`
  const markdown = sources[key]
  if (markdown === undefined) {
    throw new Error(`Missing documentation source: ${key}`)
  }
  return markdown
}

export const groups: DocGroup[] = GROUPS.map((group) => ({
  label: group.label,
  pages: group.pages.map((page) => ({ ...page, markdown: markdownFor(page.slug) })),
}))

export const pages: DocPage[] = groups.flatMap((group) => group.pages)

export const defaultSlug = pages[0].slug

export function findPage(slug: string | undefined): DocPage | undefined {
  return pages.find((page) => page.slug === slug)
}

export function neighbours(slug: string): { previous?: DocPage; next?: DocPage } {
  const index = pages.findIndex((page) => page.slug === slug)
  if (index < 0) {
    return {}
  }
  return { previous: pages[index - 1], next: pages[index + 1] }
}

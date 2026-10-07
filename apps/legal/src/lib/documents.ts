import privacySource from '../../../../PRIVACY.md?raw'
import licenseSource from '../../../../LICENSE?raw'
import noticeSource from '../../../../NOTICE?raw'

export interface LegalDocument {
  slug: string
  nav: string
  title: string
  description: string
  subtitle?: string
  mode: 'markdown' | 'verbatim'
  body: string
}

function split(source: string): { title?: string; subtitle?: string; body: string } {
  const lines = source.replace(/^﻿/, '').split('\n')
  let index = 0
  let title: string | undefined
  let subtitle: string | undefined

  while (index < lines.length && lines[index].trim() === '') {
    index += 1
  }

  const heading = /^#\s+(.+?)\s*$/.exec(lines[index] ?? '')
  if (heading) {
    title = heading[1]
    index += 1
    while (index < lines.length && lines[index].trim() === '') {
      index += 1
    }
    const lead = /^\*\*(.+?)\*\*\s*$/.exec(lines[index] ?? '')
    if (lead) {
      subtitle = lead[1]
      index += 1
    }
  }

  return { title, subtitle, body: lines.slice(index).join('\n').trim() }
}

const privacy = split(privacySource)

export const documents: LegalDocument[] = [
  {
    slug: 'privacy',
    nav: 'Privacy',
    title: privacy.title ?? 'Privacy Policy',
    subtitle: privacy.subtitle,
    description:
      'What the hosted Dokploy MCP service does with your data, and what it deliberately does not do: no database, no tracking, credentials relayed once.',
    mode: 'markdown',
    body: privacy.body,
  },
  {
    slug: 'license',
    nav: 'License',
    title: 'License',
    subtitle: 'Apache License, Version 2.0',
    description:
      'Dokploy MCP is open source under the Apache License 2.0. The full, unmodified license text.',
    mode: 'verbatim',
    body: licenseSource.replace(/^\n+/, '').trimEnd(),
  },
  {
    slug: 'notice',
    nav: 'Notice',
    title: 'Notice and attributions',
    subtitle: 'Required by section 4(d) of the Apache License 2.0',
    description:
      'Copyright notice, third-party attributions and trademark statements for Dokploy MCP.',
    mode: 'verbatim',
    body: noticeSource.replace(/^\n+/, '').trimEnd(),
  },
]

export function findDocument(slug: string | undefined): LegalDocument | undefined {
  return documents.find((document) => document.slug === slug)
}

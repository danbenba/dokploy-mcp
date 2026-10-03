import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { CONTACT_EMAIL, GITHUB_URL, LEGAL_URL, MCP_URL } from '@/lib/site-links'
import { documents } from '~/lib/documents'

const DESCRIPTION =
  'Privacy policy, Apache 2.0 license and attribution notice for Dokploy MCP, the open-source MCP server for self-hosted Dokploy panels.'

export function OverviewPage() {
  useEffect(() => {
    document.title = 'Legal — Dokploy MCP'

    const set = (selector: string, attribute: string, value: string) => {
      document.head.querySelector(selector)?.setAttribute(attribute, value)
    }

    set('meta[name="description"]', 'content', DESCRIPTION)
    set('meta[property="og:title"]', 'content', 'Legal — Dokploy MCP')
    set('meta[property="og:description"]', 'content', DESCRIPTION)
    set('meta[property="og:url"]', 'content', `${LEGAL_URL}/`)
    set('link[rel="canonical"]', 'href', `${LEGAL_URL}/`)
  }, [])

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Legal</h1>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">
          The privacy policy, the license and the attribution notice for Dokploy MCP, the
          open-source MCP server that connects your assistant to the Dokploy panel you host.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {documents.map((document) => (
          <div key={document.slug}>
            <Link
              to={`/${document.slug}`}
              className="flex h-full flex-col rounded-xl border bg-card p-6 transition-colors hover:border-muted-foreground/50"
            >
              <h2 className="flex items-center justify-between gap-3 text-lg font-medium">
                {document.title}
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground text-pretty">
                {document.description}
              </p>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-16 max-w-2xl">
        <div className="site-prose">
          <h2>If you host it yourself</h2>
          <p>
            The privacy policy on this site describes the hosted service at{' '}
            <a href={MCP_URL}>{MCP_URL.replace(/^https?:\/\//, '')}</a>. Run the server on your own
            infrastructure and you become the controller of everything it processes; the policy is
            then a template you are free to adapt. The license and the notice apply either way.
          </p>
          <h2>Contact</h2>
          <p>
            Questions about this site, a privacy request or a licensing question:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Suspected vulnerabilities
            follow <a href={`${GITHUB_URL}/blob/main/SECURITY.md`}>SECURITY.md</a> rather than a
            public issue.
          </p>
        </div>
      </div>
    </div>
  )
}

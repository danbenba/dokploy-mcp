import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProseArticle } from '@/components/site/prose-article'
import { GITHUB_URL, LEGAL_URL } from '@/lib/site-links'
import type { LegalDocument } from '~/lib/documents'

const SOURCE_FILE: Record<string, string> = {
  privacy: 'PRIVACY.md',
  license: 'LICENSE',
  notice: 'NOTICE',
}

export function DocumentPage({ document: doc }: { document: LegalDocument }) {
  const navigate = useNavigate()

  useEffect(() => {
    window.document.title = `${doc.title} — Dokploy MCP`

    const set = (selector: string, attribute: string, value: string) => {
      window.document.head.querySelector(selector)?.setAttribute(attribute, value)
    }

    set('meta[name="description"]', 'content', doc.description)
    set('meta[property="og:title"]', 'content', `${doc.title} — Dokploy MCP`)
    set('meta[property="og:description"]', 'content', doc.description)
    set('meta[property="og:url"]', 'content', `${LEGAL_URL}/${doc.slug}`)
    set('link[rel="canonical"]', 'href', `${LEGAL_URL}/${doc.slug}`)
  }, [doc])

  return (
    <article className="max-w-[46rem] py-12 sm:py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {doc.title}
        </h1>
        {doc.subtitle ? (
          <p className="mt-4 text-lg text-muted-foreground text-pretty">{doc.subtitle}</p>
        ) : null}
      </div>

      <div className="mt-10">
        {doc.mode === 'verbatim' ? (
          <pre className="site-verbatim">{doc.body}</pre>
        ) : (
          <ProseArticle markdown={doc.body} onInternalLink={(href) => navigate(href)} />
        )}
      </div>

      <p className="mt-12 border-t pt-8 text-xs text-muted-foreground">
        This page is generated from{' '}
        <a
          href={`${GITHUB_URL}/blob/main/${SOURCE_FILE[doc.slug]}`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {SOURCE_FILE[doc.slug]}
        </a>{' '}
        in the repository, so it cannot drift from the text that ships with the source. Its whole
        history is public.
      </p>
    </article>
  )
}

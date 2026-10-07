import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProseArticle } from '@/components/site/prose-article'
import { outline } from '@/lib/markdown'
import { neighbours, type DocPage as DocPageData } from '~/lib/nav'
import { DOCS_URL, GITHUB_URL } from '@/lib/site-links'

function useDocumentMeta(page: DocPageData) {
  useEffect(() => {
    document.title = `${page.title} — Dokploy MCP docs`

    const set = (selector: string, attribute: string, value: string) => {
      const element = document.head.querySelector(selector)
      element?.setAttribute(attribute, value)
    }

    set('meta[name="description"]', 'content', page.description)
    set('meta[property="og:title"]', 'content', `${page.title} — Dokploy MCP docs`)
    set('meta[property="og:description"]', 'content', page.description)
    set('meta[property="og:url"]', 'content', `${DOCS_URL}/${page.slug}`)
    set('link[rel="canonical"]', 'href', `${DOCS_URL}/${page.slug}`)
  }, [page])
}

export function DocPage({ page }: { page: DocPageData }) {
  const navigate = useNavigate()
  const sections = outline(page.markdown).filter((heading) => heading.depth === 2)
  const { previous, next } = neighbours(page.slug)

  useDocumentMeta(page)

  return (
    <article className="min-w-0 py-12 sm:py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">{page.description}</p>
      </div>

      {sections.length >= 4 ? (
        <div className="mt-10 xl:hidden">
          <nav aria-label="On this page" className="rounded-xl border bg-card p-5">
            <p className="text-[0.6875rem] font-medium tracking-wider text-muted-foreground/80 uppercase">
              On this page
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {section.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}

      <div className="mt-10">
        <ProseArticle markdown={page.markdown} onInternalLink={(href) => navigate(href)} />
      </div>

      <div className="mt-16 border-t pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
          {previous ? (
            <Link
              to={`/${previous.slug}`}
              className="group flex flex-1 flex-col rounded-xl border bg-card p-4 transition-colors hover:border-muted-foreground/50"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowLeft className="size-3.5" />
                Previous
              </span>
              <span className="mt-1 text-sm font-medium">{previous.title}</span>
            </Link>
          ) : (
            <span className="hidden flex-1 sm:block" />
          )}
          {next ? (
            <Link
              to={`/${next.slug}`}
              className="group flex flex-1 flex-col rounded-xl border bg-card p-4 text-right transition-colors hover:border-muted-foreground/50"
            >
              <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                Next
                <ArrowRight className="size-3.5" />
              </span>
              <span className="mt-1 text-sm font-medium">{next.title}</span>
            </Link>
          ) : (
            <span className="hidden flex-1 sm:block" />
          )}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Something wrong or missing on this page?{' '}
          <a
            href={`${GITHUB_URL}/blob/main/apps/docs/src/content/${page.slug}.md`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Edit it on GitHub
          </a>
          .
        </p>
      </div>
    </article>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Container } from '@/components/site/container'
import { SatelliteHeader } from '@/components/site/satellite-header'
import { SatelliteFooter } from '@/components/site/satellite-footer'
import { outline } from '@/lib/markdown'
import { DOKPLOY_URL, LEGAL_URL, NPM_URL, REGISTRY_URL, WEB_URL } from '@/lib/site-links'
import { DocNav } from '~/components/doc-nav'
import { PageOutline } from '~/components/page-outline'
import { DocPage } from '~/pages/doc-page'
import { defaultSlug, findPage } from '~/lib/nav'

const HEADER_NAV = [
  { label: 'Legal', href: LEGAL_URL },
  { label: 'npm', href: NPM_URL, external: true },
]

const FOOTER_COLUMNS = [
  {
    label: 'Docs',
    items: [
      { label: 'Quickstart', href: '/quickstart' },
      { label: 'Tool reference', href: '/tools' },
      { label: 'Troubleshooting', href: '/troubleshooting' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'dokploy.rest', href: WEB_URL },
      { label: 'npm package', href: NPM_URL, external: true },
      { label: 'MCP registry', href: REGISTRY_URL, external: true },
      { label: 'Dokploy', href: DOKPLOY_URL, external: true },
    ],
  },
]

function RoutedDocPage() {
  const { slug } = useParams()
  const page = findPage(slug)

  if (!page) {
    return <Navigate to={`/${defaultSlug}`} replace />
  }
  return <DocPage page={page} />
}

function Shell() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // The outline lives in its own column, outside the routed element, so it reads the slug from
  // the path rather than from route params. The router tolerates a trailing slash, so this has to
  // as well, or '/tools/' renders the page with no outline beside it.
  const headings = useMemo(() => {
    const page = findPage(location.pathname.replace(/^\/+|\/+$/g, ''))
    return page ? outline(page.markdown) : []
  }, [location.pathname])

  useEffect(() => {
    setMenuOpen(false)
    if (!location.hash) {
      window.scrollTo({ top: 0 })
    }
  }, [location.pathname, location.hash])

  // Resolved after the Markdown body has been rendered into the DOM.
  useEffect(() => {
    if (!location.hash) {
      return
    }
    document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [location.hash, location.pathname])

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <SatelliteHeader
        tag="Docs"
        nav={HEADER_NAV}
        width="wide"
        menu={{ open: menuOpen, onToggle: () => setMenuOpen((open) => !open) }}
      />

      {menuOpen ? (
        <div className="border-b bg-background lg:hidden">
          <Container width="wide" className="py-6">
            <DocNav onNavigate={() => setMenuOpen(false)} />
          </Container>
        </div>
      ) : null}

      <Container
        width="wide"
        className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[14rem_minmax(0,1fr)_15rem] xl:gap-12"
      >
        <aside className="hidden lg:block">
          <div className="site-rail pr-3">
            <DocNav />
          </div>
        </aside>

        <main className="min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to={`/${defaultSlug}`} replace />} />
            <Route path="/:slug" element={<RoutedDocPage />} />
            <Route path="*" element={<Navigate to={`/${defaultSlug}`} replace />} />
          </Routes>
        </main>

        <aside className="hidden xl:block">
          <div className="site-rail">
            <PageOutline headings={headings} />
          </div>
        </aside>
      </Container>

      <SatelliteFooter columns={FOOTER_COLUMNS} width="wide" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}

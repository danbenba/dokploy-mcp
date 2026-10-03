import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Container } from '@/components/site/container'
import { SatelliteHeader } from '@/components/site/satellite-header'
import { SatelliteFooter } from '@/components/site/satellite-footer'
import { DOKPLOY_URL, LEGAL_URL, NPM_URL, REGISTRY_URL, WEB_URL } from '@/lib/site-links'
import { DocNav } from '~/components/doc-nav'
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
        menu={{ open: menuOpen, onToggle: () => setMenuOpen((open) => !open) }}
      />

      {menuOpen ? (
        <div className="border-b bg-background lg:hidden">
          <Container className="py-6">
            <DocNav onNavigate={() => setMenuOpen(false)} />
          </Container>
        </div>
      ) : null}

      <Container className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-12 pr-2">
            <DocNav />
          </div>
        </aside>

        <main>
          <Routes>
            <Route path="/" element={<Navigate to={`/${defaultSlug}`} replace />} />
            <Route path="/:slug" element={<RoutedDocPage />} />
            <Route path="*" element={<Navigate to={`/${defaultSlug}`} replace />} />
          </Routes>
        </main>
      </Container>

      <SatelliteFooter columns={FOOTER_COLUMNS} />
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

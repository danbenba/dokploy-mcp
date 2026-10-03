import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Container } from '@/components/site/container'
import { SatelliteHeader } from '@/components/site/satellite-header'
import { SatelliteFooter } from '@/components/site/satellite-footer'
import { CONTACT_EMAIL, DOCS_URL, NPM_URL, WEB_URL } from '@/lib/site-links'
import { documents, findDocument } from '~/lib/documents'
import { DocumentPage } from '~/pages/document'
import { OverviewPage } from '~/pages/overview'

const HEADER_NAV = [
  { label: 'Docs', href: DOCS_URL },
  ...documents.map((document) => ({ label: document.nav, href: `/${document.slug}` })),
]

const FOOTER_COLUMNS = [
  {
    label: 'Documents',
    items: documents.map((document) => ({ label: document.nav, href: `/${document.slug}` })),
  },
  {
    label: 'Resources',
    items: [
      { label: 'dokploy.rest', href: WEB_URL },
      { label: 'Documentation', href: DOCS_URL },
      { label: 'npm package', href: NPM_URL, external: true },
      { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
]

function RoutedDocument() {
  const { slug } = useParams()
  const document = findDocument(slug)

  if (!document) {
    return <Navigate to="/" replace />
  }
  return <DocumentPage document={document} />
}

function Shell() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0 })
      return
    }
    document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [location.pathname, location.hash])

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <SatelliteHeader tag="Legal" nav={HEADER_NAV} />

      <Container>
        <main>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/:slug" element={<RoutedDocument />} />
            <Route path="*" element={<Navigate to="/" replace />} />
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

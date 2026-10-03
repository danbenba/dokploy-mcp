import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const theme = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = (dark: boolean) => document.documentElement.classList.toggle('dark', dark)

applyTheme(theme.matches)
theme.addEventListener('change', (event) => applyTheme(event.matches))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

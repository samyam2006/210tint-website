import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Flip this to `false` and redeploy to bring the full site back online.
// While `true`, the site renders nothing — a blank page with no content.
const SITE_PAUSED = true

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {SITE_PAUSED ? null : <App />}
  </StrictMode>,
)

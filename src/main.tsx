import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Flip this to `true` and redeploy to pause the site (renders a blank page).
const SITE_PAUSED = false

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {SITE_PAUSED ? null : <App />}
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Paused from './Paused.tsx'

// Flip this to `false` and redeploy to bring the full site back online.
const SITE_PAUSED = true

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {SITE_PAUSED ? <Paused /> : <App />}
  </StrictMode>,
)

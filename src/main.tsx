import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Hide Telegram splash screen and expand window
if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

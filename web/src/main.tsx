import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { setFeedbackEnabled } from './feedback'
import { applyTheme, loadSettings } from './settings'
import './styles.css'

// Apply the saved theme before first paint to avoid a flash.
const initial = loadSettings()
applyTheme(initial.theme)
setFeedbackEnabled(initial.uiFeedback)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

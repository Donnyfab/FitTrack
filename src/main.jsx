import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/registerServiceWorker'
import { applyStoredThemePreference } from '@/lib/theme'

applyStoredThemePreference()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

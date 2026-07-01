import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/registerServiceWorker'
import { applyStoredThemePreference } from '@/lib/theme'
import { installPageZoomGuards } from '@/lib/disablePageZoom'

applyStoredThemePreference()
installPageZoomGuards()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

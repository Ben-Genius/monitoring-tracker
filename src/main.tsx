import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import { identify, initAnalytics, resetAnalytics } from './lib/analytics'
import { useAuthStore } from './features/auth/hooks/useAuth'

// Usage analytics: tie events to whoever is signed in, by id only.
initAnalytics()
useAuthStore.subscribe((state, prev) => {
    if (state.user && state.user.id !== prev.user?.id) identify(state.user)
    else if (!state.user && prev.user) resetAnalytics()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)

// Installable app and offline shell (public/sw.js). Production only: in dev
// a cached shell would hide changes.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`/sw.js?v=${__BUILD_ID__}`).catch(() => {
            // The app works the same without it; installing and offline start are extras.
        });
    });
}

import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './query/queryClient'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {
      // Keep app boot resilient even if push worker registration fails.
    });
  });
}

navigator.serviceWorker
  .register("/firebase-messaging-sw.js")
  .then((registration) => {
    console.log("✅ Service Worker registered:", registration);
  })
  .catch((error) => {
    console.error("❌ Service Worker registration failed:", error);
  });

 

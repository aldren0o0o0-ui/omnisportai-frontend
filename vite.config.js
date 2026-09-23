import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const matchesNodeModule = (id, moduleName) =>
  id.includes(`/node_modules/${moduleName}/`) ||
  id.includes(`\\node_modules\\${moduleName}\\`)

const manualChunks = (id) => {
  if (!id.includes('node_modules')) return undefined

  if (
    matchesNodeModule(id, 'react') ||
    matchesNodeModule(id, 'react-dom') ||
    matchesNodeModule(id, 'scheduler')
  ) {
    return 'vendor-react'
  }

  if (
    matchesNodeModule(id, 'react-router') ||
    matchesNodeModule(id, 'react-router-dom')
  ) {
    return 'vendor-router'
  }

  if (matchesNodeModule(id, 'recharts')) {
    return 'vendor-charts'
  }

  if (
    matchesNodeModule(id, 'react-big-calendar') ||
    matchesNodeModule(id, 'moment')
  ) {
    return 'vendor-calendar'
  }

  if (
    matchesNodeModule(id, 'react-dnd') ||
    matchesNodeModule(id, 'react-dnd-html5-backend') ||
    matchesNodeModule(id, 'dnd-core') ||
    matchesNodeModule(id, '@react-dnd')
  ) {
    return 'vendor-dnd'
  }

  if (matchesNodeModule(id, 'lucide-react')) {
    return 'vendor-icons'
  }

  if (matchesNodeModule(id, 'axios')) {
    return 'vendor-axios'
  }

  return 'vendor-misc'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})

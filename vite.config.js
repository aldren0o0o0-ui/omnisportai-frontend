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
    proxy: {
      '/auth': 'http://localhost:8001',
      '/users': 'http://localhost:8001',
      '/admin': 'http://localhost:8001',
      '/departments': 'http://localhost:8001',
      '/sports': 'http://localhost:8001',
      '/teams': 'http://localhost:8001',
      '/players': 'http://localhost:8001',
      '/tournaments': 'http://localhost:8001',
      '/venues': 'http://localhost:8001',
      '/brackets': 'http://localhost:8001',
      '/intramurals': 'http://localhost:8001',
      '/competitions': 'http://localhost:8001',
      '/competition-entries': 'http://localhost:8001',
      '/competition-directory': 'http://localhost:8001',
      '/entry-pools': 'http://localhost:8001',
      '/api': 'http://localhost:8001',
      '/static': 'http://localhost:8001',
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})

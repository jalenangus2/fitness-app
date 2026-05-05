import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LifeOS Dashboard',
        short_name: 'LifeOS',
        theme_color: '#0f172a', // Your slate-900 color
        background_color: '#0f172a',
        display: 'standalone', // This hides the Safari URL bar
        icons: [
          {
            src: '/vite.svg', // Update this to a real 192x192 icon later
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const supabasePattern = supabaseUrl
    ? new RegExp('^' + supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/rest/v1/')
    : null

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          importScripts: ['/push-handler.js'],
          runtimeCaching: supabasePattern ? [
            {
              urlPattern: supabasePattern,
              handler: 'NetworkFirst' as const,
              options: {
                cacheName: 'supabase-api',
                expiration: { maxEntries: 60, maxAgeSeconds: 300 },
                networkTimeoutSeconds: 5,
              },
            },
          ] : [],
        },
        manifest: {
          name: 'Guayra Comandas',
          short_name: 'Comandas',
          description: 'Sistema de comandas',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'minimal-ui',
          orientation: 'portrait-primary',
          start_url: '/login',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})

import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  clearScreen: host === undefined,
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'app-icon/apple-touch-icon-180x180.png'],
      manifest: {
        name: 'DBO Studio',
        short_name: 'DBO',
        description: 'Modern and easy to use SQL client',
        theme_color: '#0077CC',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/app-icon/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/app-icon/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/app-icon/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/app-icon/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 8000000,
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ],
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  resolve: {
    tsconfigPaths: true
  },
  server: {
    strictPort: true,
    host: host !== undefined ? host : true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    target:
      process.env.TAURI_PLATFORM === 'windows' || process.env.TAURI_PLATFORM === 'linux' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: process.env.NODE_ENV !== 'development' || !process.env.TAURI_DEBUG ? 'oxc' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true
          }
        }
      }
    }
  }
});

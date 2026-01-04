import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

const host = process.env.TAURI_DEV_HOST;
const ReactCompilerConfig = {};

export default defineConfig({
  clearScreen: host === undefined,
  plugins: [
    react({
      //@ts-ignore
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig],
        ],
      },
    }),
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
      }
    }),
    tsconfigPaths()
  ],
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    strictPort: true,
    host: host !== undefined ? host : true,
    port: 3000
  },
  build: {
    target:
      process.env.TAURI_PLATFORM === 'windows' || process.env.TAURI_PLATFORM === 'linux' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: process.env.NODE_ENV !== 'development' || !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG
  },
  esbuild: {
    drop: ['console', 'debugger'],
    supported: {
      'top-level-await': true
    }
  }
});

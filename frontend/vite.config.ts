import { createRequire } from 'node:module';

import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';

import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ mode }) => {
  // Config file does not auto-load .env into process.env; loadEnv does.
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT || process.env.VITE_PORT || 3000);

  return {
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
          navigateFallbackDenylist: [/^\/api/],
          globIgnores: ['**/fonts/**'],
          runtimeCaching: [
            {
              urlPattern: ({ url }): boolean => /\/fonts\/.+\.woff2$/i.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'dbo-fonts',
                expiration: {
                  maxEntries: 64,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    resolve: {
      tsconfigPaths: true,
      alias: {
        'monaco-editor/editor/editor.worker': require.resolve('monaco-editor/editor/editor.worker.js'),
        'monaco-editor/language/json/json.worker': require.resolve('monaco-editor/language/json/json.worker.js')
      }
    },
    server: {
      strictPort: true,
      host: host !== undefined ? host : true,
      port,
      proxy: {
        '/api': {
          target: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    build: {
      target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
      minify: !process.env.TAURI_ENV_DEBUG ? 'oxc' : false,
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
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
  };
});

import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  envPrefix: [
    'VITE_',
    'TAURI_PLATFORM',
    'TAURI_ARCH',
    'TAURI_FAMILY',
    'TAURI_PLATFORM_VERSION',
    'TAURI_PLATFORM_TYPE',
    'TAURI_DEBUG'
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    port: 3000
  },
  build: {
    target:
      process.env.TAURI_PLATFORM === 'windows' || process.env.TAURI_PLATFORM === 'linux' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG
  },
  esbuild: {
    supported: {
      'top-level-await': true
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: 'vitest.setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    },
    exclude: ['node_modules'],
    alias: [
      {
        find: /^monaco-editor$/,
        replacement: `${__dirname}/node_modules/monaco-editor/esm/vs/editor/editor.api`
      }
    ]
  }
});

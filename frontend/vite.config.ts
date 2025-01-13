import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  clearScreen: host === undefined,
  plugins: [react(), tsconfigPaths()],
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
    reporters: process.env.GITHUB_ACTIONS ? ['dot', 'github-actions'] : ['dot'],
    alias: [
      {
        find: /^monaco-editor$/,
        replacement: `${__dirname}/node_modules/monaco-editor/esm/vs/editor/editor.api`
      }
    ]
  }
});

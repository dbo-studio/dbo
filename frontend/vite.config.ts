import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
  optimizeDeps: {
    include: [
      `monaco-editor/esm/vs/editor/editor.worker?worker`,
      `monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker`
    ]
  },
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: process.env.TAURI_PLATFORM == 'windows' || process.env.TAURI_PLATFORM == 'linux' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          editorWorker: [`monaco-editor/esm/vs/editor/editor.worker?worker`],
          pgsqlWorker: [`monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker`]
        }
      }
    }
  }
});

import { globalStyles } from '@/core/theme/global.ts';
import { ensureDefaultFonts } from '@/core/fonts';

import { loader } from '@monaco-editor/react';
import { CssBaseline, GlobalStyles, type Interpolation, type Theme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as monaco from 'monaco-editor';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Toaster from '@/components/base/Toaster/Toaster';
import { DevCrashProbe, ErrorBoundary } from './components/common/ErrorBoundary/ErrorBoundary';
import ThemeProvider from './core/theme/index.tsx';
import Home from './routes/index.tsx';
import SharedDashboard from './routes/SharedDashboard/SharedDashboard.tsx';

// A share link opens a read-only page of its own: no sign-in, no app shell.
const SHARE_PATH = /^\/share\/([^/]+)\/?$/;
const shareToken = SHARE_PATH.exec(window.location.pathname)?.[1];
// Home hides the boot splash once the app is ready; the share page has nothing to wait for.
if (shareToken) document.getElementById('boot-splash')?.remove();

loader.config({ monaco });

if (import.meta.env.DEV) {
  (window as unknown as { monaco: typeof monaco }).monaco = monaco;
}

void ensureDefaultFonts();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {import.meta.env.DEV && <DevCrashProbe />}
      <ThemeProvider>
        <GlobalStyles styles={(theme: Theme): Interpolation<Theme> => globalStyles(theme)} />
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          {shareToken ? <SharedDashboard token={decodeURIComponent(shareToken)} /> : <Home />}
        </QueryClientProvider>
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

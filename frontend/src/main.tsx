import { globalStyles } from '@/core/theme/global.ts';
import { ensureDefaultFonts } from '@/core/fonts';

import { loader } from '@monaco-editor/react';
import { CssBaseline, GlobalStyles, type Interpolation, type Theme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as monaco from 'monaco-editor';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import ThemeProvider from './core/theme/index.tsx';
import Home from './routes/index.tsx';

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
    <ThemeProvider>
      <GlobalStyles styles={(theme: Theme): Interpolation<Theme> => globalStyles(theme)} />
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>
      <Toaster position='bottom-center' duration={5000} richColors closeButton={true} />
    </ThemeProvider>
  </React.StrictMode>
);

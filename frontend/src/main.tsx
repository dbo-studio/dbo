import { globalStyles } from '@/core/theme/global.ts';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource-variable/jetbrains-mono';

import { CssBaseline, GlobalStyles } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import ThemeProvider from './core/theme/index.tsx';
import { Router } from './routes/intex.tsx';
import './components/base/SqlEditor/helpers/languageSetup.ts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

enableMocking().then(() => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: false
      }
    }
  });

  // biome-ignore lint: reason
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <GlobalStyles styles={(theme) => globalStyles(theme)} />
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <Router />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        <Toaster position='bottom-center' duration={5000} richColors closeButton={true} />
      </ThemeProvider>
    </React.StrictMode>
  );
});

async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const { worker } = await import('./core/mocks/browser.ts');

  return worker.start();
}

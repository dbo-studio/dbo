import { globalStyles } from '@/core/theme/global.ts';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { CssBaseline, GlobalStyles, type Interpolation, type Theme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import './components/base/SqlEditor/helpers/languageSetup.ts';
import ThemeProvider from './core/theme/index.tsx';
import Home from './routes/index.tsx';

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
        <GlobalStyles styles={(theme): Interpolation<Theme> => globalStyles(theme)} />
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <Home />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        <Toaster position='bottom-center' duration={5000} richColors closeButton={true} />
      </ThemeProvider>
    </React.StrictMode>
  );
});

// biome-ignore lint/nursery/useExplicitType: <explanation>
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const { worker } = await import('./core/mocks/browser.ts');

  return worker.start();
}

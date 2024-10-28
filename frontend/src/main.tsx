import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { tools } from '@/core/utils';
import { CssBaseline } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import ThemeProvider from './core/theme/index.tsx';
import { Router } from './routes/intex.tsx';

enableMocking().then(() => {
  // biome-ignore lint: reason
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <CssBaseline />
        <Router />
        <Toaster position='bottom-center' duration={5000} richColors closeButton={true} />
      </ThemeProvider>
    </React.StrictMode>
  );
});

async function enableMocking() {
  if (process.env.NODE_ENV !== 'development' || tools.isTauri()) {
    return;
  }

  const { worker } = await import('./core/mocks/browser.ts');

  return worker.start();
}

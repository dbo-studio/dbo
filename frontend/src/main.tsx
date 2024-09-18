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
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and ready to intercept requests.
  return worker.start();
}

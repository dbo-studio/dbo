import { CssBaseline } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import ThemeProvider from './core/theme/index.tsx';
import { Router } from './routes/intex.tsx';

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

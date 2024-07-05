import { CssBaseline } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.tsx';
import ThemeProvider from './core/theme/index.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <CssBaseline />
      <App />
      <Toaster position='bottom-center' duration={5000} richColors />
    </ThemeProvider>
  </React.StrictMode>
);

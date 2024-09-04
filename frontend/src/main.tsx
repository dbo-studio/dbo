import { CssBaseline } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import ThemeProvider from './core/theme/index.tsx';
import { router } from './routes/intex.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <CssBaseline />
      <RouterProvider router={router} />
      <Toaster position='bottom-center' duration={5000} richColors />
    </ThemeProvider>
  </React.StrictMode>
);

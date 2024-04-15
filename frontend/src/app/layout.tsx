import ThemeProvider from '@/core/theme';
import { CssBaseline } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { Metadata, Viewport } from 'next';
import React from 'react';
import { Toaster } from 'sonner';
import { appConfig } from '../appConfig';

export const metadata: Metadata = {
  title: appConfig.title,
  description: appConfig.description
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={appConfig.locale} dir={appConfig.direction}>
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider>
            <CssBaseline />
            {children}
            <Toaster position='bottom-center' duration={5000} richColors />
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

import SplashScreen from '@/components/base/SplashScreen/SplashScreen';
import Layout from '@/components/layout/Layout.tsx';
import { useStartup } from '@/hooks/useStartup.hook';
import locales from '@/locales';
import { type JSX, useEffect } from 'react';

const dismissBootSplash = (): void => {
  const bootSplash = document.getElementById('boot-splash');
  if (!bootSplash) {
    return;
  }
  bootSplash.classList.add('is-hidden');
  window.setTimeout(() => bootSplash.remove(), 250);
};

export default function Home(): JSX.Element | null {
  const { ready, boot } = useStartup();

  useEffect(() => {
    if (ready) {
      dismissBootSplash();
    }
  }, [ready]);

  if (!ready) {
    return (
      <SplashScreen
        message={locales.starting_engine}
        errorMessage={boot.status === 'error' ? boot.errorMessage : null}
        onRetry={boot.status === 'error' ? boot.retry : undefined}
      />
    );
  }

  return <Layout />;
}

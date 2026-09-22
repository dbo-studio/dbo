import AuthGateScreen from '@/components/common/Auth/AuthGateScreen/AuthGateScreen';
import ChangePasswordGateScreen from '@/components/common/Auth/ChangePasswordGateScreen/ChangePasswordGateScreen';
import TotpGateScreen from '@/components/common/Auth/TotpGateScreen/TotpGateScreen';
import SplashScreen from '@/components/base/SplashScreen/SplashScreen';
import Layout from '@/components/layout/Layout.tsx';
import { useStartup } from '@/hooks/useStartup';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
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
  const gate = useAuthStore((s) => s.gate);

  useEffect(() => {
    if (gate !== 'loading' || ready) {
      dismissBootSplash();
    }
  }, [ready, gate]);

  if (gate === 'login') {
    return <AuthGateScreen />;
  }

  if (gate === 'change_password') {
    return <ChangePasswordGateScreen />;
  }

  if (gate === 'totp') {
    return <TotpGateScreen />;
  }

  if (!ready || gate === 'loading') {
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

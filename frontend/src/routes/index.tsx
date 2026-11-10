import AuthGateScreen from '@/components/common/Auth/AuthGateScreen/AuthGateScreen';
import SetupGateScreen from '@/components/common/Auth/SetupGateScreen/SetupGateScreen';
import ChangePasswordGateScreen from '@/components/common/Auth/ChangePasswordGateScreen/ChangePasswordGateScreen';
import TotpGateScreen from '@/components/common/Auth/TotpGateScreen/TotpGateScreen';
import SplashScreen from '@/components/base/SplashScreen/SplashScreen';
import Layout from '@/components/layout/Layout.tsx';
import MobileShell from '@/components/layout/MobileShell/MobileShell';
import { useEscapeFullscreenGuard } from '@/hooks/useEscapeFullscreenGuard';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useEventStream } from '@/hooks/useEventStream';
import { useTraySync } from '@/hooks/useTraySync';
import { useStartup } from '@/hooks/useStartup';
import locales from '@/locales';
import { withMobileDensity } from '@/core/theme/mobileDensity';
import Onboarding from '@/components/common/Onboarding/Onboarding';
import { useAccountStore } from '@/store/accountStore/account.store';
import { useAuthStore } from '@/store/authStore/auth.store';
import { ThemeProvider } from '@mui/material';
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
  useEscapeFullscreenGuard();
  const gate = useAuthStore((s) => s.gate);
  const onboarded = useAccountStore((s) => s.onboarded);
  // Phones get the dedicated mobile shell; tablets keep the desktop layout with overlay sidebars.
  const { isMobile, isTablet, isTouch } = useLayoutMode();

  // The live stream needs the signed-in session, so it opens once the app is past its gates.
  useEventStream(ready && gate === 'ready');
  useTraySync(ready && gate === 'ready');

  useEffect(() => {
    if (gate !== 'loading' || ready) {
      dismissBootSplash();
    }
  }, [ready, gate]);

  if (gate === 'setup') {
    return <SetupGateScreen />;
  }

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

  if (!onboarded) {
    return <Onboarding onFinish={(): void => useAccountStore.getState().finishOnboarding()} />;
  }

  if (isMobile) {
    return <MobileShell />;
  }

  // Touch tablets keep the desktop layout but get the 44px hit targets of the phone shell.
  return isTablet && isTouch ? (
    <ThemeProvider theme={withMobileDensity}>
      <Layout />
    </ThemeProvider>
  ) : (
    <Layout />
  );
}

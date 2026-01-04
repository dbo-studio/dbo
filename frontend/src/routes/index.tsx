import SplashScreen from '@/components/base/SplashScreen/SplashScreen';
import Layout from '@/components/layout/Layout.tsx';
import { useStartup } from '@/hooks/useStartup.hook';
import type { JSX } from 'react';

export default function Home(): JSX.Element | null {
  const done = useStartup();

  if (!done) {
    return <SplashScreen />;
  }

  return <Layout />;
}

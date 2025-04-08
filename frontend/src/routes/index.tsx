import Layout from '@/components/layout/Layout.tsx';
import { useSetupDesktop } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { type JSX, useEffect } from 'react';

export default function Home(): JSX.Element | null {
  const done = useSetupDesktop();
  const { debug } = useSettingStore();

  useEffect(() => {
    import('eruda').then((eruda) => {
      try {
        if (debug) {
          eruda.default.init();
        } else {
          eruda.default.destroy();
        }
      } catch (_) {}
    });
  }, [debug]);

  return done ? <Layout /> : null;
}

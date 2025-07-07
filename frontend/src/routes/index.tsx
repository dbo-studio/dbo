import Layout from '@/components/layout/Layout.tsx';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useSetupDesktop } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useEffect } from 'react';

export default function Home(): JSX.Element | null {
  const done = useSetupDesktop();
  const debug = useSettingStore((state) => state.debug);

  useEffect(() => {
    indexedDBService.clearAllTableData().catch((err: unknown) => {
      console.log('🚀 ~ useEffect ~ err:', err);
    });
  }, []);

  useEffect(() => {
    import('eruda').then((eruda) => {
      try {
        if (debug) {
          eruda.default.init();
        } else {
          eruda.default.destroy();
        }
      } catch (_) { }
    });
  }, [debug]);

  return done ? <Layout /> : null;
}

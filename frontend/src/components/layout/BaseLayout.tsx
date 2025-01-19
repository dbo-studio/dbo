import Layout from '@/components/layout/Layout.tsx';
import { useSetupDesktop } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { useEffect } from 'react';

export default function BaseLayout() {
  const done = useSetupDesktop();
  const { debug } = useSettingStore();

  useEffect(() => {
    console.log('asdqs');
    import('eruda').then((eruda) => {
      if (debug) {
        eruda.default.init();
      } else {
        eruda.default.destroy();
      }
    });
  }, [debug]);

  return done ? <Layout /> : null;
}

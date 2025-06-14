import { changeUrl } from '@/core/api';
import { tools } from '@/core/utils';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

export const useSetupDesktop = (): boolean => {
  const [loaded, setLoaded] = useState(false);
  const reset = useTabStore((state) => state.reset);

  useEffect(() => {
    tools
      .isTauri()
      .then((e) => {
        if (!e) return;
        reset();
        setup().then();
      })
      .catch((e) => {
        console.log('=>(useSetupDesktop.hook.ts:28) e', e);
      })
      .finally(() => setLoaded(true));
  }, []);

  return loaded;
};

const setup = async (): Promise<void> => {
  disableDefaultContextMenu();
  await setupMenu();
  await setupBackend();
};

const setupBackend = async (): Promise<void> => {
  const response = await invoke('get_backend_host');
  if (response === '') {
    alert('cant found empty port!');
    return;
  }

  changeUrl(response as string);
};

const disableDefaultContextMenu = (): void => {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      return false;
    },
    { capture: true }
  );

  document.addEventListener(
    'selectstart',
    (e) => {
      e.preventDefault();
      return false;
    },
    { capture: true }
  );
};

const setupMenu = async (): Promise<void> => {};

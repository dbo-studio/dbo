import { changeUrl } from '@/core/services/api/intialize';
import { tools } from '@/core/utils';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

export const useSetupDesktop = () => {
  const [loaded, setLoaded] = useState(false);
  const reset = useTabStore((state) => state.reset);

  useEffect(() => {
    if (!tools.isTauri()) {
      setLoaded(true);
      return;
    }
    reset();
    invoke('get_backend_host').then((response) => {
      if (response === '') {
        alert('cant found empty port!');
        return;
      }

      changeUrl(response as string);
      setLoaded(true);
    });
  }, []);

  return loaded;
};

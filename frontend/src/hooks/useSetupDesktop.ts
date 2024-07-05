import { changeUrl } from '@/core/services/api/intialize';
import { tools } from '@/core/utils';
import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';

export const useSetupDesktop = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (tools.isTauri()) {
      invoke('get_backend_host').then((response) => {
        if (response == '') {
          alert('cant found empty port!');
          return;
        }
        changeUrl(response as string);
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, []);

  return loaded;
};

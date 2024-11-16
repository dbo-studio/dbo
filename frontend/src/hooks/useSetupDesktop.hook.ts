import { changeUrl } from '@/core/services/api/intialize';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

export const useSetupDesktop = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
      localStorage.clear();
      
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

import api from '@/api';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSetupDesktop } from './useSetupDesktop.hook';

export const useStartup = (): boolean => {
  const done = useSetupDesktop();
  const debug = useSettingStore((state) => state.debug);
  const updateProviders = useAiStore((state) => state.updateProviders);

  const { isLoading: isLoadingProviders } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const providers = await api.aiProvider.getProviders();
      updateProviders(providers);
      return providers;
    }
  });

  useEffect(() => {
    if (debug) {
      import('eruda').then((eruda) => {
        eruda.default.init();
      });
    }
  }, [debug]);

  useEffect(() => {
    indexedDBService.clearAllTableData().catch((err: unknown) => {
      console.log('🚀 ~ useEffect ~ err:', err);
    });
  }, []);

  useEffect(() => {
    if (debug) {
      import('eruda').then((eruda) => {
        try {
          eruda.default.init();
        } catch (_) {}
      });
    }
  }, [debug]);

  return done && !isLoadingProviders;
};

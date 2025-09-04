import api from '@/api';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSetupDesktop } from './useSetupDesktop.hook';

export const useStartup = (): boolean => {
  const done = useSetupDesktop();
  const debug = useSettingStore((state) => state.debug);
  const updateProviders = useAiStore((state) => state.updateProviders);
  const updateVersion = useSettingStore((state) => state.updateVersion);
  const resetTree = useTreeStore((state) => state.reset);

  const { isLoading: isLoadingConfig } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const config = await api.config.getConfig();
      updateProviders(config.providers);
      updateVersion(config.version);
      return config;
    }
  });

  useEffect(() => {
    resetTree();
    indexedDBService.clearAllTableData().catch((err: unknown) => {
      console.debug('🚀 ~ useEffect ~ err:', err);
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

  return done && !isLoadingConfig;
};

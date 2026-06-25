import api from '@/api';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSetupDesktop } from './useSetupDesktop.hook';

export const useStartup = (): boolean => {
  const done = useSetupDesktop();
  const debug = useSettingStore((state) => state.general.debug);
  const updateProviders = useAiStore((state) => state.updateProviders);
  const updateContext = useAiStore((state) => state.updateContext);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);

  const resetTree = useTreeStore((state) => state.reset);

  useQuery({
    queryKey: ['startup-autocomplete', currentConnectionId, updateContext],
    queryFn: async () => {
      if (!currentConnectionId) return null;
      const autocomplete = await api.query.autoComplete({
        connectionId: Number(currentConnectionId)
      });
      const context = useAiStore.getState().context;
      updateContext({
        ...context,
        tables: autocomplete.tables.slice(0, 5),
        views: autocomplete.views.slice(0, 5)
      });
      return autocomplete;
    },
    enabled: done && !!currentConnectionId,
    staleTime: 5 * 60 * 1000
  });

  const { isLoading: isLoadingConfig } = useQuery({
    queryKey: ['config', updateProviders, updateGeneral],
    queryFn: async () => {
      const config = await api.config.getConfig();
      updateProviders(config.providers);
      updateGeneral({
        logsPath: config.logsPath,
        version: config.version,
        release: config.newReleaseVersion
      });

      return config;
    },
    enabled: done
  });

  useEffect(() => {
    resetTree();
    indexedDBService.clearAllTableData().catch((err: unknown) => {
      console.debug('🚀 ~ useEffect ~ err:', err);
    });
  }, [resetTree]);

  useEffect(() => {
    if (debug) {
      import('eruda')
        .then((eruda) => {
          try {
            eruda.default.init();
          } catch {
            // Ignore error
          }
        })
        .catch((e) => console.debug('🚀 ~ useStartup ~ e:', e));
    }
  }, [debug]);

  return done && !isLoadingConfig;
};

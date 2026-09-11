import api from '@/api';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { applyUserWorkspaceScope } from '@/core/storage/applyUserWorkspace';
import { tools } from '@/core/utils';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSetupDesktop, type DesktopBootState } from './useSetupDesktop';

export type StartupState = {
  ready: boolean;
  boot: DesktopBootState;
};

export const useStartup = (): StartupState => {
  const boot = useSetupDesktop();
  const done = boot.ready;
  const debug = useSettingStore((state) => state.general.debug);
  const updateProviders = useAiStore((state) => state.updateProviders);
  const updateContext = useAiStore((state) => state.updateContext);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const applyStatus = useAuthStore((state) => state.applyStatus);
  const gate = useAuthStore((state) => state.gate);
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopResolved, setDesktopResolved] = useState(false);

  const resetTree = useTreeStore((state) => state.reset);

  useEffect(() => {
    tools
      .isTauri()
      .then((v) => {
        setIsDesktop(Boolean(v));
        setDesktopResolved(true);
      })
      .catch(() => {
        setIsDesktop(false);
        setDesktopResolved(true);
      });
  }, []);

  const { isLoading: isLoadingAuth, isFetched: authFetched } = useQuery({
    queryKey: ['auth-status', isDesktop],
    queryFn: async () => {
      if (isDesktop) {
        applyStatus({
          mode: 'none',
          authenticated: true,
          mustChangePassword: false
        });
        await applyUserWorkspaceScope(undefined);
        return null;
      }

      const status = await api.auth.getStatus();
      applyStatus(status);
      await applyUserWorkspaceScope(status.authenticated ? status.user?.id : undefined);
      return status;
    },
    enabled: done && desktopResolved,
    retry: false,
    staleTime: 30 * 1000
  });

  const authReady = isDesktop || (authFetched && gate === 'ready');

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
    enabled: done && authReady && !!currentConnectionId,
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
    enabled: done && authReady
  });

  useEffect(() => {
    resetTree();
    void indexedDBService.hydrateTabQueries();
    indexedDBService.clearAllTableData().catch(() => undefined);
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
        .catch(() => undefined);
    }
  }, [debug]);

  return {
    ready: done && !isLoadingAuth && authReady && !isLoadingConfig,
    boot
  };
};

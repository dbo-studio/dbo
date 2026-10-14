import api from '@/api';
import { isPasswordPromptSuppressedForConnection } from '@/core/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

const pickSelectableActiveConnection = (connections: ConnectionType[]): ConnectionType | undefined => {
  const passwordPromptConnectionId = useSettingStore.getState().ui.passwordPromptConnectionId;

  return connections.find(
    (c) => c.isActive && !isPasswordPromptSuppressedForConnection(c.id) && c.id !== passwordPromptConnectionId
  );
};

type ConnectionsList = {
  connections: ConnectionType[] | undefined;
  currentConnectionId: number | undefined;
  /** Id of the connection currently being activated, if any. */
  activatingConnectionId: number | undefined;
  selectConnection: (connection: ConnectionType) => Promise<void>;
  reorder: (activeId: string, overId: string) => void;
};

/**
 * Loads the connection list, keeps a current connection selected, and switches connections
 * (activating it on the server and restoring that connection's last tab).
 */
export const useConnectionsList = (): ConnectionsList => {
  const [loadingConnectionId, setLoadingConnectionId] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  const connections = useConnectionStore((state) => state.connections);
  const currentConnection = useConnectionStore((state) => state.currentConnection);
  const updateLoading = useConnectionStore((state) => state.updateLoading);
  const updateCurrentConnection = useConnectionStore((state) => state.updateCurrentConnection);
  const updateConnections = useConnectionStore((state) => state.updateConnections);
  const reorderConnections = useConnectionStore((state) => state.reorderConnections);
  const switchTab = useTabStore((state) => state.switchTab);

  useQuery({
    queryKey: ['connections'],
    queryFn: async (): Promise<ConnectionType[]> => {
      updateLoading('loading');
      try {
        const list = await api.connection.getConnectionList();
        updateConnections(list);
        if (!useConnectionStore.getState().currentConnectionId) {
          updateCurrentConnection(pickSelectableActiveConnection(list));
        }
        updateLoading('finished');
        return useConnectionStore.getState().connections ?? list;
      } catch (error) {
        updateLoading('error');
        throw error;
      }
    }
  });

  const { mutateAsync: updateConnectionMutation, isPending: pendingUpdateConnection } = useMutation({
    mutationFn: (id: number): Promise<ConnectionType> => api.connection.updateConnection(id, { isActive: true }),
    onMutate: (id: number): void => {
      setLoadingConnectionId(id);
      updateLoading('loading');
    }
  });

  useEffect(() => {
    if (!connections?.length) {
      return;
    }

    if (!useConnectionStore.getState().currentConnectionId) {
      const active = pickSelectableActiveConnection(connections);
      if (active) {
        updateCurrentConnection(active);
      }
    }
  }, [connections, updateCurrentConnection]);

  const selectConnection = useCallback(
    async (c: ConnectionType): Promise<void> => {
      const tabs = selectTabs(useTabStore.getState());
      const store = useConnectionStore.getState();
      if (c.id === store.currentConnection()?.id || store.loading === 'loading') {
        return;
      }
      try {
        await updateConnectionMutation(c.id);
        updateLoading('finished');
        updateCurrentConnection(c);
        await queryClient.invalidateQueries({
          queryKey: ['connections']
        });
        const connectionTabs = tabs.filter((tab) => matchConnectionId(tab.connectionId, c.id));
        const selectedTabId = useTabStore.getState().selectedTabId;
        const activeTab = connectionTabs.find((tab) => tab.id === selectedTabId) ?? connectionTabs[0];
        switchTab(activeTab?.id ?? null);
      } catch {
        updateLoading('error');
      }
    },
    [queryClient, switchTab, updateConnectionMutation, updateCurrentConnection, updateLoading]
  );

  const reorder = useCallback(
    (activeId: string, overId: string): void => {
      reorderConnections(activeId, overId);
      const ordered = useConnectionStore.getState().connections;
      if (ordered) {
        queryClient.setQueryData(['connections'], ordered);
      }
    },
    [queryClient, reorderConnections]
  );

  return {
    connections,
    currentConnectionId: currentConnection()?.id,
    activatingConnectionId: pendingUpdateConnection ? loadingConnectionId : undefined,
    selectConnection,
    reorder
  };
};

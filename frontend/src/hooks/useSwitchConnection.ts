import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

type UseSwitchConnectionReturn = {
  switchConnection: (connection: ConnectionType) => Promise<void>;
  isSwitching: boolean;
  switchingId: number | undefined;
};

/** Makes a connection the current one and selects its last tab; shared by the connection rail and the agent workspace. */
export const useSwitchConnection = (): UseSwitchConnectionReturn => {
  const [switchingId, setSwitchingId] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();
  const updateLoading = useConnectionStore((state) => state.updateLoading);
  const updateCurrentConnection = useConnectionStore((state) => state.updateCurrentConnection);
  const switchTab = useTabStore((state) => state.switchTab);

  const { mutateAsync: activateConnection, isPending } = useMutation({
    mutationFn: (id: number): Promise<ConnectionType> => api.connection.updateConnection(id, { isActive: true }),
    onMutate: (id: number): void => {
      setSwitchingId(id);
      updateLoading('loading');
    }
  });

  const switchConnection = useCallback(
    async (connection: ConnectionType): Promise<void> => {
      const tabs = selectTabs(useTabStore.getState());
      const store = useConnectionStore.getState();
      if (connection.id === store.currentConnection()?.id || store.loading === 'loading') {
        return;
      }
      try {
        await activateConnection(connection.id);
        updateLoading('finished');
        updateCurrentConnection(connection);
        await queryClient.invalidateQueries({
          queryKey: ['connections']
        });
        const connectionTabs = tabs.filter((tab) => matchConnectionId(tab.connectionId, connection.id));
        const selectedTabId = useTabStore.getState().selectedTabId;
        const activeTab = connectionTabs.find((tab) => tab.id === selectedTabId) ?? connectionTabs[0];
        switchTab(activeTab?.id ?? null);
      } catch {
        updateLoading('error');
      }
    },
    [activateConnection, queryClient, switchTab, updateCurrentConnection, updateLoading]
  );

  return { switchConnection, isSwitching: isPending, switchingId };
};

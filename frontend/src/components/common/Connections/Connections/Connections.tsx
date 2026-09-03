'use no memo';

import api from '@/api';
import SortableList from '@/components/base/SortableList/SortableList';
import AddConnection from '@/components/common/AddConnection/AddConnection';
import { isPasswordPromptSuppressedForConnection } from '@/core/api';
import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useCallback, useEffect, useState } from 'react';
import EditConnection from '../../AddConnection/EditConnection';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import ConnectionPasswordPromptModal from './ConnectionPasswordPrompt/ConnectionPasswordPrompt';
import { ConnectionsListStyled, ConnectionsStyled } from './Connections.styled';
import ConnectionsEmptyState from './ConnectionsEmptyState';
import { EmptySpaceStyle } from './EmptySpace.styled';
import type { ConnectionsProps } from '../types';

const pickSelectableActiveConnection = (connections: ConnectionType[]): ConnectionType | undefined => {
  const passwordPromptConnectionId = useSettingStore.getState().ui.passwordPromptConnectionId;

  return connections.find(
    (c) => c.isActive && !isPasswordPromptSuppressedForConnection(c.id) && c.id !== passwordPromptConnectionId
  );
};

export default function Connections({ expanded = false }: ConnectionsProps): JSX.Element {
  const [loadingConnectionId, setLoadingConnectionId] = useState<number | undefined>(undefined);
  const { showConnectionsRail } = useLayoutMode();

  const queryClient = useQueryClient();

  const connections = useConnectionStore((state) => state.connections);
  const currentConnection = useConnectionStore((state) => state.currentConnection);
  const updateLoading = useConnectionStore((state) => state.updateLoading);
  const updateCurrentConnection = useConnectionStore((state) => state.updateCurrentConnection);
  const updateConnections = useConnectionStore((state) => state.updateConnections);
  const reorderConnections = useConnectionStore((state) => state.reorderConnections);
  const switchTab = useTabStore((state) => state.switchTab);
  const updateUI = useSettingStore((state) => state.updateUI);

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

  useEffect(() => {
    if (!connections) {
      return;
    }

    if (connections.length === 0 && showConnectionsRail) {
      updateUI({ showAddConnection: true, duplicateConnectionId: undefined });
    }
  }, [connections, showConnectionsRail, updateUI]);

  const handleChangeCurrentConnection = useCallback(
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
      } catch (error) {
        updateLoading('error');
        console.debug('🚀 ~ handleChangeCurrentConnection ~ error:', error);
      }
    },
    [queryClient, switchTab, updateConnectionMutation, updateCurrentConnection, updateLoading]
  );

  const handleReorder = useCallback(
    (activeId: string, overId: string): void => {
      reorderConnections(activeId, overId);
      const ordered = useConnectionStore.getState().connections;
      if (ordered) {
        queryClient.setQueryData(['connections'], ordered);
      }
    },
    [queryClient, reorderConnections]
  );

  const renderConnectionItem = useCallback(
    (c: ConnectionType): JSX.Element => {
      return (
        <ConnectionItem
          loading={pendingUpdateConnection && loadingConnectionId === c.id}
          onClick={() => void handleChangeCurrentConnection(c)}
          selected={c.id === currentConnection()?.id}
          connection={c}
        />
      );
    },
    [currentConnection, handleChangeCurrentConnection, loadingConnectionId, pendingUpdateConnection]
  );

  const getConnectionId = useCallback((c: ConnectionType): string => String(c.id), []);

  const hasConnections = Boolean(connections && connections.length > 0);
  const sortableKey = connections
    ?.map((c) => c.id)
    .slice()
    .sort((a, b) => a - b)
    .join('|');

  return (
    <ConnectionsStyled expanded={expanded} expandedLayout='column'>
      <AddConnection />
      <EditConnection />
      <ConnectionPasswordPromptModal />
      {expanded && !hasConnections ? (
        <ConnectionsEmptyState />
      ) : (
        <>
          {hasConnections && connections && (
            <ConnectionsListStyled expanded={expanded}>
              <SortableList
                key={sortableKey}
                items={connections}
                onReorder={handleReorder}
                renderItem={renderConnectionItem}
                getItemId={getConnectionId}
                direction='vertical'
                activationDistance={8}
              />
            </ConnectionsListStyled>
          )}
          {!expanded && <EmptySpaceStyle />}
        </>
      )}
    </ConnectionsStyled>
  );
}

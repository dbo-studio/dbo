'use no memo';

import SortableList from '@/components/base/SortableList/SortableList';
import AddConnection from '@/components/common/AddConnection/AddConnection';
import { canCreateConnection } from '@/core/auth/permissions';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { ConnectionType } from '@/types';
import { type JSX, useCallback, useEffect } from 'react';
import EditConnection from '../AddConnection/EditConnection';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import ConnectionPasswordPromptModal from './ConnectionPasswordPrompt/ConnectionPasswordPrompt';
import { ConnectionsListStyled, ConnectionsStyled } from './Connections.styled';
import ConnectionsEmptyState from './ConnectionsEmptyState';
import { EmptySpaceStyle } from './EmptySpace.styled';
import type { ConnectionsProps } from './types';
import { useConnectionsList } from './useConnectionsList';

export default function Connections({ expanded = false }: ConnectionsProps): JSX.Element {
  const { showConnectionsRail } = useLayoutMode();
  const { connections, currentConnectionId, activatingConnectionId, selectConnection, reorder } = useConnectionsList();
  const updateUI = useSettingStore((state) => state.updateUI);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAddConnection = canCreateConnection(mode, user);

  useEffect(() => {
    if (!connections) {
      return;
    }

    if (connections.length === 0 && showConnectionsRail && canAddConnection) {
      updateUI({ showAddConnection: true, duplicateConnectionId: undefined });
    }
  }, [canAddConnection, connections, showConnectionsRail, updateUI]);

  const renderConnectionItem = useCallback(
    (c: ConnectionType, _index: number, meta: { overlay: boolean }): JSX.Element => {
      return (
        <ConnectionItem
          loading={activatingConnectionId === c.id}
          onClick={() => void selectConnection(c)}
          selected={c.id === currentConnectionId}
          connection={c}
          overlay={meta.overlay}
        />
      );
    },
    [activatingConnectionId, currentConnectionId, selectConnection]
  );

  const getConnectionId = useCallback((c: ConnectionType): string => String(c.id), []);

  const hasConnections = Boolean(connections && connections.length > 0);

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
                items={connections}
                onReorder={reorder}
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

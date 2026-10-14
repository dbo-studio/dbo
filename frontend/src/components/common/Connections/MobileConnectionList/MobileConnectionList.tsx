import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import ListRow from '@/components/base/ListRow/ListRow';
import Search from '@/components/base/Search/Search';
import { getConnectionAlias } from '@/core/db/connectionAliases';
import locales from '@/locales';
import type { ConnectionType } from '@/types';
import { CircularProgress, IconButton } from '@mui/material';
import { type JSX, type MouseEvent, useState } from 'react';
import ConnectionsEmptyState from '../ConnectionsEmptyState';
import type { MobileConnectionListProps } from '../types';
import { useConnectionsList } from '../useConnectionsList';
import ConnectionActionSheet from './ConnectionActionSheet/ConnectionActionSheet';
import {
  ConnectionStatusDotStyled,
  MobileConnectionListSearchStyled,
  MobileConnectionListStyled
} from './MobileConnectionList.styled';

const SEARCH_THRESHOLD = 5;

export default function MobileConnectionList({ onOpenCurrent }: MobileConnectionListProps): JSX.Element {
  const { connections, currentConnectionId, activatingConnectionId, selectConnection } = useConnectionsList();
  const [search, setSearch] = useState('');
  const [actionsFor, setActionsFor] = useState<ConnectionType | undefined>(undefined);

  const term = search.trim().toLowerCase();
  const visible = (connections ?? []).filter((c) => !term || c.name.toLowerCase().includes(term));

  const handleSelect = (connection: ConnectionType): void => {
    if (connection.id === currentConnectionId) {
      onOpenCurrent();
      return;
    }
    void selectConnection(connection);
  };

  const handleMore = (event: MouseEvent, connection: ConnectionType): void => {
    event.stopPropagation();
    setActionsFor(connection);
  };

  const renderStatus = (connection: ConnectionType): JSX.Element | null => {
    if (activatingConnectionId === connection.id) {
      return <CircularProgress size={16} />;
    }
    return connection.isActive ? <ConnectionStatusDotStyled aria-label={locales.mobile_connected} /> : null;
  };

  return (
    <>
      {actionsFor && <ConnectionActionSheet connection={actionsFor} onClose={(): void => setActionsFor(undefined)} />}

      {connections?.length === 0 ? (
        <ConnectionsEmptyState />
      ) : (
        <MobileConnectionListStyled>
          {(connections?.length ?? 0) > SEARCH_THRESHOLD && (
            <MobileConnectionListSearchStyled>
              <Search onChange={setSearch} />
            </MobileConnectionListSearchStyled>
          )}
          {visible.map((c) => {
            const alias = getConnectionAlias(c.type);
            return (
              <ListRow
                key={c.id}
                testId={`mobile-connection-${c.name}`}
                selected={c.id === currentConnectionId}
                leading={<CustomIcon type={(alias?.logo ?? c.icon ?? c.type) as keyof typeof IconTypes} size='l' />}
                title={c.name}
                subtitle={alias?.name ?? c.type}
                onClick={(): void => handleSelect(c)}
                onLongPress={(): void => setActionsFor(c)}
                trailing={
                  <>
                    {renderStatus(c)}
                    <IconButton
                      component='span'
                      aria-label={locales.mobile_more_actions}
                      onClick={(event): void => handleMore(event, c)}
                    >
                      <CustomIcon type='ellipsisVertical' size='s' />
                    </IconButton>
                  </>
                }
              />
            );
          })}
        </MobileConnectionListStyled>
      )}
    </>
  );
}

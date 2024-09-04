import api from '@/api';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { ConnectionType } from '@/types';
import { Suspense, lazy, useEffect } from 'react';
import { v4 as uuid } from 'uuid';

import { updateConnectionType } from '@/api/connection/types';
import { useCurrentConnection } from '@/hooks';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { ConnectionsStyled } from './Connections.styled';
import { EmptySpaceStyle } from './EmptySpace.styled';

const AddConnection = lazy(() => import('../AddConnection/AddConnection'));
const EditConnection = lazy(() => import('../EditConnection/EditConnection'));

export default function Connections() {
  const { connections, updateCurrentConnection, updateConnections, updateShowAddConnection } = useConnectionStore();
  const currentConnection = useCurrentConnection();

  const { request: getConnectionList } = useAPI({
    apiMethod: api.connection.getConnectionList
  });

  const { request: getConnectionDetail } = useAPI({
    apiMethod: api.connection.getConnectionDetail
  });

  const { request: updateConnection } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  useEffect(() => {
    getConnectionList().then((res) => {
      if (res.length > 0) {
        updateConnections(res);
        const activeConnection = res.filter((c: ConnectionType) => c.isActive);
        if (activeConnection.length > 0) handleChangeCurrentConnection(activeConnection[0]);
      } else {
        updateShowAddConnection(true);
      }
    });
  }, []);

  const handleChangeCurrentConnection = (c: ConnectionType) => {
    if (c.id === currentConnection?.id) {
      return;
    }
    getConnectionDetail({
      connectionID: c?.id,
      fromCache: true
    }).then((res) => {
      updateCurrentConnection(res);
      updateConnection({
        id: c.id,
        is_active: true
      } as updateConnectionType);
    });
  };

  return (
    <ConnectionsStyled>
      <Suspense>
        <AddConnection />
      </Suspense>
      <Suspense>
        <EditConnection />
      </Suspense>
      {connections?.map((c: ConnectionType) => (
        <ConnectionItem
          onClick={() => handleChangeCurrentConnection(c)}
          key={uuid()}
          selected={c.id == currentConnection?.id}
          connection={c}
        />
      ))}
      <EmptySpaceStyle />
    </ConnectionsStyled>
  );
}

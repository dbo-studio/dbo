import api from '@/api';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { Suspense, lazy, useEffect } from 'react';
import { v4 as uuid } from 'uuid';

import type { updateConnectionType } from '@/api/connection/types';
import useNavigate from '@/hooks/useNavigate.hook';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { ConnectionsStyled } from './Connections.styled';
import { EmptySpaceStyle } from './EmptySpace.styled';

const AddConnection = lazy(() => import('../AddConnection/AddConnection'));
const EditConnection = lazy(() => import('../EditConnection/EditConnection'));

export default function Connections() {
  const { currentConnection, connections, updateCurrentConnection, updateConnections, updateShowAddConnection } =
    useConnectionStore();
  const navigate = useNavigate();

  const { request: getConnectionDetail } = useAPI({
    apiMethod: api.connection.getConnectionDetail
  });

  const { request: updateConnection } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  useEffect(() => {
    if (!connections) {
      return;
    }

    if (connections.length === 0) {
      updateShowAddConnection(true);
    }

    if (connections.length > 0) {
      updateConnections(connections);
      const activeConnection = connections.filter((c: ConnectionType) => c.isActive);
      if (activeConnection.length > 0) handleChangeCurrentConnection(activeConnection[0]);
    } else {
      updateShowAddConnection(true);
    }
  }, [connections]);

  const handleChangeCurrentConnection = async (c: ConnectionType) => {
    if (c.id === currentConnection?.id) {
      return;
    }

    try {
      const connectionDetail = await getConnectionDetail({
        connectionID: c?.id,
        fromCache: true
      });

      updateCurrentConnection(connectionDetail);
      await updateConnection({
        id: c.id,
        is_active: true
      } as updateConnectionType);

      navigate({
        connectionId: c.id
      });
    } catch (error) {}
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
          selected={c.id === currentConnection?.id}
          connection={c}
        />
      ))}
      <EmptySpaceStyle />
    </ConnectionsStyled>
  );
}

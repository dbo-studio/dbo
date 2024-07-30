import api from '@/api';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { ConnectionType } from '@/types';
import { Box } from '@mui/material';
import { Suspense, lazy, useEffect } from 'react';
import { v4 as uuid } from 'uuid';

import { updateConnectionType } from '@/api/connection/types';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { EmptySpaceStyle } from './EmptySpace.styled';

const AddConnection = lazy(() => import('../AddConnection/AddConnection'));
const EditConnection = lazy(() => import('../EditConnection/EditConnection'));

export default function Connections() {
  const { connections, currentConnection, updateCurrentConnection, updateConnections, updateShowAddConnection } =
    useConnectionStore();

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
    <Box height={'100%'} display={'flex'} flexDirection={'column'}>
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
    </Box>
  );
}

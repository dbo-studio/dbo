import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { ConnectionType } from '@/src/types';
import { Box } from '@mui/material';
import { useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import AddConnection from '../AddConnection/AddConnection/AddConnection';
import EditConnection from '../EditConnection/EditConnection/EditConnection';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { EmptySpaceStyle } from './EmptySpace.styled';

export default function Connections() {
  const { connections, currentConnection, updateCurrentConnection, updateConnections, updateShowAddConnection } =
    useConnectionStore();

  const { request: getConnectionList } = useAPI({
    apiMethod: api.connection.getConnectionList
  });

  const { request: getConnectionDetail } = useAPI({
    apiMethod: api.connection.getConnectionDetail
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
    getConnectionDetail(c?.id).then((res) => {
      updateCurrentConnection(res);
    });
  };

  return (
    <Box height={'100%'} display={'flex'} flexDirection={'column'}>
      <AddConnection />
      <EditConnection />

      {connections?.map((c: ConnectionType) => (
        <ConnectionItem
          onClick={() => handleChangeCurrentConnection(c)}
          key={uuid()}
          selected={c.name == currentConnection?.name}
          connection={c}
        />
      ))}
      <EmptySpaceStyle />
    </Box>
  );
}
import { getConnection, getConnections } from '@/src/core/services';
import { useUUID } from '@/src/hooks';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { ConnectionResponseType, ConnectionType, ConnectionsResponseType } from '@/src/types';
import { Box } from '@mui/material';
import { useEffect } from 'react';
import ConnectionItem from './ConnectionItem';
import { EmptySpaceStyle } from './EmptySpace.styled';

export default function Connections() {
  const {
    connections,
    currentConnection,
    getCurrentSchema,
    updateCurrentConnection,
    updateConnections,
    updateCurrentSchema
  } = useConnectionStore();

  useEffect(() => {
    if (connections == undefined) {
      getConnections().then((res: ConnectionsResponseType) => {
        updateConnections(res.data);
      });
    }
  }, []);

  const uuids = useUUID(connections?.length);

  const handleChangeCurrentConnection = (c: ConnectionType) => {
    getConnection(c.id).then((res: ConnectionResponseType) => {
      updateCurrentConnection(res.data);
      if (!getCurrentSchema()) updateCurrentSchema(res.data.database.schemes[0]);
    });
  };

  return (
    <Box height={'100%'} display={'flex'} flexDirection={'column'}>
      {connections?.map((c: ConnectionType, index: number) => (
        <ConnectionItem
          onClick={() => handleChangeCurrentConnection(c)}
          key={uuids[index]}
          selected={c.name == currentConnection?.name}
          label={c.name}
        />
      ))}
      <EmptySpaceStyle />
    </Box>
  );
}

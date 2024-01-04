import { useUUID } from '@/src/hooks';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { ConnectionType } from '@/src/types/Connection';
import { Box } from '@mui/material';
import ConnectionItem from './ConnectionItem';
import { EmptySpaceStyle } from './EmptySpace.styled';

export default function Connections() {
  const { connections, currentConnection } = useConnectionStore();
  const uuids = useUUID(connections.length);

  return (
    <Box height={'100%'} display={'flex'} flexDirection={'column'}>
      {connections.map((c: ConnectionType, index: number) => (
        <ConnectionItem key={uuids[index]} selected={c.info.name == currentConnection.info.name} label={c.info.name} />
      ))}
      <EmptySpaceStyle />
    </Box>
  );
}

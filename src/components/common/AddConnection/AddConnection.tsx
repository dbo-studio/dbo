import { variables } from '@/src/core/theme/variables';
import { useUUID } from '@/src/hooks';
import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Button, Typography } from '@mui/material';
import { useEffect } from 'react';
import Search from '../../base/Search/Search';
import { AddConnectionModalStyled, AddConnectionStyled } from './AddConnection.styled';
import ConnectionItem from './ConnectionItem';
import { ConnectionType } from './types';

const connectionTypes: ConnectionType[] = [
  {
    name: 'PostgreSQL',
    logo: '/images/connections/postgresql_logo.png'
  }
];

export default function AddConnection() {
  const { connections, updateShowAddConnection, showAddConnection } = useConnectionStore();
  const uuids = useUUID(connectionTypes.length);

  useEffect(() => {
    if (!connections || connections.length == 0) {
      updateShowAddConnection(true);
    } else {
      updateShowAddConnection(false);
    }
  }, [connections]);

  const handleClose = () => updateShowAddConnection(false);

  const handleSearch = (value: string) => {
    console.log(value);
  };

  return (
    <AddConnectionModalStyled open={showAddConnection}>
      <AddConnectionStyled>
        <Box>
          <Typography variant='h6'>{locales.new_connection}</Typography>
        </Box>
        <Box flex={1}>
          <Search onChange={handleSearch} />

          <Box border={`1px solid black`} borderRadius={variables.radius.medium}>
            {connectionTypes.map((c, index: number) => (
              <ConnectionItem key={uuids[index]} connection={c} />
            ))}
          </Box>
        </Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <Button size='small' onClick={handleClose}>
            {locales.cancel}
          </Button>
          <Button size='small' variant='contained'>
            {locales.create}
          </Button>
        </Box>
      </AddConnectionStyled>
    </AddConnectionModalStyled>
  );
}

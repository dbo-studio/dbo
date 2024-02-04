import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Button, Typography } from '@mui/material';
import { useEffect } from 'react';
import Search from '../../base/Search/Search';
import { AddConnectionModalStyled, AddConnectionStyled } from './AddConnection.styled';

export default function AddConnection() {
  const { connections, updateShowAddConnection, showAddConnection } = useConnectionStore();
  useEffect(() => {
    if (!connections || connections.length == 0) {
      updateShowAddConnection(true);
    } else {
      updateShowAddConnection(false);
    }
  }, [connections]);

  const handleClose = () => updateShowAddConnection(false);

  return (
    <AddConnectionModalStyled open={showAddConnection}>
      <AddConnectionStyled>
        <Box>
          <Typography variant='h6'>{locales.new_connection}</Typography>
        </Box>
        <Box flex={1}>
          <Search
            onChange={function (value: string): void {
              throw new Error('Function not implemented.');
            }}
          />
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

import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Typography } from '@mui/material';
import { AddConnectionModalStyled, AddConnectionStyled } from '../AddConnection/AddConnection.styled';
import ConnectionSetting from './ConnectionSettings';

export default function EditConnection() {
  const { updateShowEditConnection, showEditConnection } = useConnectionStore();

  const handleClose = () => {
    updateShowEditConnection(undefined);
  };

  return (
    <AddConnectionModalStyled open={showEditConnection !== undefined}>
      <AddConnectionStyled>
        <Box>
          <Typography variant='h6'>{locales.edit_connection}</Typography>
        </Box>
        <ConnectionSetting onClose={handleClose} connection={showEditConnection} />
      </AddConnectionStyled>
    </AddConnectionModalStyled>
  );
}

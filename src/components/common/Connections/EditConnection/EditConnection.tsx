import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Typography } from '@mui/material';
import ConnectionSetting from './ConnectionSettings';
import { EditConnectionModalStyled, EditConnectionStyled } from './EditConnection.styled';

export default function EditConnection() {
  const { updateShowEditConnection, showEditConnection } = useConnectionStore();

  const handleClose = () => {
    updateShowEditConnection(undefined);
  };

  return (
    <EditConnectionModalStyled open={showEditConnection !== undefined}>
      <EditConnectionStyled>
        <Box>
          <Typography variant='h6'>{locales.edit_connection}</Typography>
        </Box>
        <ConnectionSetting onClose={handleClose} connection={showEditConnection} />
      </EditConnectionStyled>
    </EditConnectionModalStyled>
  );
}

import api from '@/src/api';
import CustomIcon from '@/src/components/base/CustomIcon/CustomIcon';
import ConfirmModal from '@/src/components/base/Modal/ConfirmModal';
import useAPI from '@/src/hooks/useApi.hook';
import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Menu, MenuItem, Stack } from '@mui/material';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConnectionContextMenuProps } from '../../types';

export default function ConnectionContextMenu({ connection, contextMenu, onClose }: ConnectionContextMenuProps) {
  const { updateShowEditConnection } = useConnectionStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const { request: deleteConnection } = useAPI({
    apiMethod: api.connection.deleteConnection
  });

  const handleOpenConfirm = () => {
    setShowConfirm(!showConfirm);
    onClose();
  };

  const handleDeleteConnection = async () => {
    try {
      await deleteConnection(connection.id);
      toast.success(locales.connection_delete_success);
      onClose();
    } catch (err) {
      console.log(err);
    }
  };

  const handleEditConnection = () => {
    updateShowEditConnection(connection);
  };

  return (
    <Box>
      <ConfirmModal open={showConfirm} title={locales.connection_delete_confirm} onConfirm={handleDeleteConnection} />
      <Menu
        open={contextMenu !== null}
        onClose={onClose}
        anchorReference='anchorPosition'
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={handleEditConnection}>
          <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
            {locales.edit}
            <CustomIcon type='settings' />
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleOpenConfirm}>
          <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
            {locales.delete}
            <CustomIcon type='delete' />
          </Stack>
        </MenuItem>
      </Menu>
    </Box>
  );
}

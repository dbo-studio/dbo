import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import locales from '@/src/locales';
import { Menu, MenuItem, Stack } from '@mui/material';
import { toast } from 'sonner';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import { ConnectionContextMenuProps } from './types';

export default function ConnectionContextMenu({ connection, contextMenu, onClose }: ConnectionContextMenuProps) {
  const { request: deleteConnection } = useAPI({
    apiMethod: api.connection.deleteConnection
  });

  const handleDeleteConnection = async () => {
    try {
      await deleteConnection(connection.id);
      toast.success(locales.connection_delete_success);
      onClose();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Menu
      open={contextMenu !== null}
      onClose={onClose}
      anchorReference='anchorPosition'
      anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
    >
      <MenuItem onClick={onClose}>
        <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
          {locales.edit}
          <CustomIcon type='settings' />
        </Stack>
      </MenuItem>
      <MenuItem onClick={handleDeleteConnection}>
        <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
          {locales.delete}
          <CustomIcon type='delete' />
        </Stack>
      </MenuItem>
    </Menu>
  );
}

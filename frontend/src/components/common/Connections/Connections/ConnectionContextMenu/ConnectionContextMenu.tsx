import api from '@/src/api';
import CustomIcon from '@/src/components/base/CustomIcon/CustomIcon';
import useAPI from '@/src/hooks/useApi.hook';
import locales from '@/src/locales';
import { useConfirmModalStore } from '@/src/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Menu, MenuItem, Stack } from '@mui/material';
import { toast } from 'sonner';
import { ConnectionContextMenuProps } from '../../types';

export default function ConnectionContextMenu({ connection, contextMenu, onClose }: ConnectionContextMenuProps) {
  const { updateShowEditConnection, updateConnections, updateCurrentConnection, currentConnection, connections } =
    useConnectionStore();
  const { updateSelectedTab, updateTabs } = useTabStore();
  const showModal = useConfirmModalStore((state) => state.show);

  const { request: deleteConnection } = useAPI({
    apiMethod: api.connection.deleteConnection
  });

  const handleOpenConfirm = async () => {
    onClose();
    showModal(locales.delete_action, locales.connection_delete_confirm, () => {
      handleDeleteConnection();
    });
  };

  const handleDeleteConnection = async () => {
    try {
      const res = await deleteConnection(connection.id);
      if (res.length == 0) {
        updateConnections([]);
        updateCurrentConnection(undefined);
        updateSelectedTab(undefined);
        updateTabs([]);
      } else {
        if (currentConnection) {
          const found = res?.findIndex((connection) => currentConnection.id == connection.id);
          if (found == -1) {
            updateSelectedTab(undefined);
            updateTabs([]);
            updateCurrentConnection(res[0]);
          }
          updateConnections(res);
        }
      }
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

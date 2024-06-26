import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { useCopyToClipboard } from '@/hooks';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Menu, MenuItem, Stack } from '@mui/material';
import { toast } from 'sonner';
import { SavedQueryContextMenuProps } from '../../types';

export default function SavedQueryContextMenu({
  query,
  contextMenu,
  onClose,
  onDelete,
  onChange
}: SavedQueryContextMenuProps) {
  const [_, copy] = useCopyToClipboard();
  const { addTab } = useTabStore();

  const showModal = useConfirmModalStore((state) => state.show);

  const { request: deleteSavedQuery, pending: pendingDelete } = useAPI({
    apiMethod: api.savedQueries.deleteSavedQuery
  });

  const handleDelete = async () => {
    onClose();
    showModal(locales.delete_action, locales.query_saved_delete_confirm, async () => {
      try {
        await deleteSavedQuery(query.id);
        toast.success(locales.database_delete_success);
        onDelete();
      } catch (err) {
        console.log('🚀 ~ handleSaveChange ~ err:', err);
      }
    });
  };

  const handleCopy = async () => {
    try {
      await copy(query.query);
      toast.success(locales.database_delete_success);
    } catch (error) {
      console.log('🚀 ~ handleCopy ~ error:', error);
    } finally {
      onClose();
    }
  };

  const handleRun = () => {
    const name = query.name.slice(0, 10);
    addTab(name, TabMode.Query, query.query);
    onClose();
  };

  return (
    <Box>
      <Menu
        open={contextMenu !== null}
        onClose={onClose}
        anchorReference='anchorPosition'
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={handleRun}>
          <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
            {locales.run}
            <CustomIcon type='play' />
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleCopy}>
          <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
            {locales.copy}
            <CustomIcon type='copy' />
          </Stack>
        </MenuItem>
        <MenuItem onClick={onChange}>
          <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
            {locales.rename}
            <CustomIcon type='pen' />
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
            {locales.delete}
            <CustomIcon type='delete' />
          </Stack>
        </MenuItem>
      </Menu>
    </Box>
  );
}

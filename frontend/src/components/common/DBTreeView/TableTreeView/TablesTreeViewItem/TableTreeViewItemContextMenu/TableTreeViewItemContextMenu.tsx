import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { useCopyToClipboard } from '@/hooks';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Menu, MenuItem, Stack } from '@mui/material';
import { toast } from 'sonner';
import { TablesTreeViewItemContextMenuProps } from '../../../types';

export default function TableTreeViewItemContextMenu({
  table,
  contextMenu,
  onClose
}: TablesTreeViewItemContextMenuProps) {
  const [_, copy] = useCopyToClipboard();
  const { addTab } = useTabStore();

  const menus = [
    {
      name: '',
      icon: '',
      action: ''
    }
  ];

  const handleCopy = async () => {
    try {
      await copy(table);
      toast.success(locales.database_delete_success);
    } catch (error) {
      console.log('🚀 ~ handleCopy ~ error:', error);
    } finally {
      onClose();
    }
  };

  const handleRun = () => {
    addTab(table, TabMode.Data);
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
      </Menu>
    </Box>
  );
}

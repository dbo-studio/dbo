import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { useCopyToClipboard } from '@/hooks';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Menu, MenuItem, Stack } from '@mui/material';
import { toast } from 'sonner';
import { HistoryContextMenuProps } from '../../types';

export default function HistoryContextMenu({ history, contextMenu, onClose }: HistoryContextMenuProps) {
  const [_, copy] = useCopyToClipboard();
  const { addTab } = useTabStore();

  const handleCopy = async () => {
    try {
      await copy(history.query);
      toast.success(locales.database_delete_success);
    } catch (error) {
      console.log('🚀 ~ handleCopy ~ error:', error);
    } finally {
      onClose();
    }
  };

  const handleRun = () => {
    const name = history.query.slice(0, 10);
    addTab(name, TabMode.Query, history.query);
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

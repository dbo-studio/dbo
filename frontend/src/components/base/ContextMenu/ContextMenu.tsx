import { useUUID } from '@/hooks';
import { Box, Menu, MenuItem, Stack } from '@mui/material';
import CustomIcon from '../CustomIcon/CustomIcon';
import type { ContextMenuProps, MenuType } from './types';

export default function ContextMenu({ menu, contextMenu, onClose }: ContextMenuProps) {
  const uuids = useUUID(menu.length);

  const handleClick = (m: MenuType) => {
    if (m.closeBeforeAction) {
      onClose();
    }
    m.action();
    if (m.closeAfterAction) {
      onClose();
    }
  };

  return (
    <Box>
      <Menu
        autoFocus={false}
        disableAutoFocus={true}
        disableAutoFocusItem={true}
        open={contextMenu !== null}
        onClose={onClose}
        anchorReference='anchorPosition'
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        {menu.map((m, index) => (
          <MenuItem onClick={() => handleClick(m)} key={uuids[index]}>
            <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
              {m.name}
              {m.icon && <CustomIcon type={m.icon} />}
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

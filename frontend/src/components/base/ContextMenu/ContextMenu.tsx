import { useUUID } from '@/hooks';
import { Box, Divider, Menu, MenuItem, Stack } from '@mui/material';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';
import type { ContextMenuProps, MenuType } from './types';

export default function ContextMenu({ menu, contextMenu, onClose }: ContextMenuProps): JSX.Element {
  const uuids = useUUID(menu.length);
  const [nestedMenu, setNestedMenu] = useState<{
    mouseX: number;
    mouseY: number;
    menuItems: MenuType[];
  } | null>(null);

  const parentMenuRef = useRef<HTMLDivElement>(null);
  const nestedMenuRef = useRef<HTMLDivElement>(null);

  const handleClick = (m: MenuType): void => {
    if (m.children || m.separator) {
      return;
    }
    if (m.closeBeforeAction) {
      setNestedMenu(null);
      onClose();
    }
    m.action?.();
    if (m.closeAfterAction) {
      setNestedMenu(null);
      onClose();
    }
  };

  const isMouseInMenu = useCallback((event: MouseEvent, menuRef: React.RefObject<HTMLDivElement | null>): boolean => {
    if (!menuRef.current) return false;
    const rect = menuRef.current.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent): void => {
      if (!nestedMenu) return;

      const isInNested = isMouseInMenu(event, nestedMenuRef);
      if (!isInNested) {
        setNestedMenu(null);
      }
    },
    [nestedMenu, isMouseInMenu]
  );

  useEffect(() => {
    if (nestedMenu) {
      document.addEventListener('mousemove', handleMouseMove);
    }
    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [nestedMenu, handleMouseMove]);

  const handleMouseEnter = (event: React.MouseEvent, menuItems: MenuType[]): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    setNestedMenu({
      mouseX: rect.right,
      mouseY: rect.top,
      menuItems
    });
  };

  const renderMenuItem = (m: MenuType, index: number, isNested = false): JSX.Element => {
    if (m.separator) {
      return (
        <Divider
          sx={{ marginBottom: '0px !important', marginTop: '0px !important' }}
          key={`${isNested ? 'nested-' : ''}separator-${index}`}
        />
      );
    }

    return (
      <MenuItem
        disabled={m.disabled}
        onClick={(): void => handleClick(m)}
        key={isNested ? `nested-${m.name}-${index}` : uuids[index]}
        onMouseEnter={(e): void => m.children && handleMouseEnter(e, m.children)}
        sx={{
          minHeight: '36px',
          position: 'relative'
        }}
      >
        <Stack width={'100%'} alignItems={'center'} justifyContent={'space-between'} direction={'row'}>
          {m.name}
          <Stack direction={'row'} spacing={1}>
            {m.children && <CustomIcon type='arrowRight' />}
            {m.icon && <CustomIcon type={m.icon} />}
          </Stack>
        </Stack>
      </MenuItem>
    );
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Menu
        ref={parentMenuRef}
        autoFocus={false}
        disableAutoFocus={true}
        disableAutoFocusItem={true}
        open={contextMenu !== null}
        onClose={onClose}
        anchorReference='anchorPosition'
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        sx={{
          '& .MuiPaper-root': {
            minWidth: '200px'
          }
        }}
      >
        {menu.map((m, index) => renderMenuItem(m, index))}
      </Menu>

      {nestedMenu && (
        <Menu
          ref={nestedMenuRef}
          autoFocus={false}
          disableAutoFocus={true}
          disableAutoFocusItem={true}
          open={nestedMenu !== null}
          onClose={(): void => setNestedMenu(null)}
          anchorReference='anchorPosition'
          anchorPosition={nestedMenu !== null ? { top: nestedMenu.mouseY, left: nestedMenu.mouseX } : undefined}
          sx={{
            pointerEvents: 'auto',
            '& .MuiPaper-root': {
              minWidth: '200px',
              position: 'fixed',
              zIndex: 1300
            }
          }}
          slotProps={{
            paper: {
              elevation: 3,
              onMouseLeave: (): void => setNestedMenu(null)
            }
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
        >
          {nestedMenu.menuItems.map((m, index) => renderMenuItem(m, index, true))}
        </Menu>
      )}
    </Box>
  );
}

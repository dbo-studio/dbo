import { useUUID } from '@/hooks';
import { Box, Divider, Menu, MenuItem, Stack, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';
import { ContextMenuItemStackStyled } from './ContextMenu.styled';
import type { ContextMenuProps, MenuType } from './types';

export default function ContextMenu({ menu, contextMenu, onClose }: ContextMenuProps): JSX.Element {
  const uuids = useUUID(menu.length);
  const [nestedMenu, setNestedMenu] = useState<{
    mouseX: number;
    mouseY: number;
    menuItems: MenuType[];
  } | null>(null);

  const parentPaperRef = useRef<HTMLDivElement>(null);
  const nestedPaperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contextMenu === null) {
      setNestedMenu(null);
    }
  }, [contextMenu]);

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

  const isMouseInElement = useCallback((event: MouseEvent, el: HTMLElement | null): boolean => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
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

      const inParent = isMouseInElement(event, parentPaperRef.current);
      const inNested = isMouseInElement(event, nestedPaperRef.current);
      if (!inParent && !inNested) {
        setNestedMenu(null);
      }
    },
    [nestedMenu, isMouseInElement]
  );

  useEffect(() => {
    if (!nestedMenu) return;
    document.addEventListener('mousemove', handleMouseMove);
    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [nestedMenu, handleMouseMove]);

  const handleParentItemMouseEnter = (event: React.MouseEvent, m: MenuType): void => {
    if (m.children) {
      const rect = event.currentTarget.getBoundingClientRect();
      setNestedMenu({
        mouseX: rect.right,
        mouseY: rect.top,
        menuItems: m.children
      });
      return;
    }
    setNestedMenu(null);
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

    const itemKey = isNested ? `nested-${m.name}-${index}` : uuids[index];
    const menuItem = (
      <MenuItem
        disabled={m.disabled}
        onClick={(): void => handleClick(m)}
        onMouseEnter={isNested ? undefined : (e): void => handleParentItemMouseEnter(e, m)}
        data-testid={`context-menu-item-${m.name.toLowerCase().replace(/\s+/g, '-')}`}
        sx={{
          minHeight: '36px',
          position: 'relative',
          color: m.destructive ? 'error.main' : undefined
        }}
      >
        <ContextMenuItemStackStyled direction={'row'}>
          {m.name}
          <Stack direction={'row'} spacing={1}>
            {m.children && <CustomIcon type='chevronRight' />}
            {m.icon && <CustomIcon type={m.icon} />}
          </Stack>
        </ContextMenuItemStackStyled>
      </MenuItem>
    );

    if (m.disabled && m.disabledReason) {
      return (
        <Tooltip key={itemKey} title={m.disabledReason} placement='right'>
          <span style={{ display: 'block' }}>{menuItem}</span>
        </Tooltip>
      );
    }

    return <span key={itemKey}>{menuItem}</span>;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Menu
        autoFocus={false}
        disableAutoFocus={true}
        disableAutoFocusItem={true}
        open={contextMenu !== null}
        onClose={onClose}
        anchorReference='anchorPosition'
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        slotProps={{
          paper: {
            ref: parentPaperRef
          }
        }}
      >
        {menu.map((m, index) => renderMenuItem(m, index))}
      </Menu>

      {nestedMenu && (
        <Menu
          autoFocus={false}
          disableAutoFocus={true}
          disableAutoFocusItem={true}
          disableEnforceFocus={true}
          disableRestoreFocus={true}
          open={nestedMenu !== null}
          onClose={(): void => setNestedMenu(null)}
          anchorReference='anchorPosition'
          anchorPosition={nestedMenu !== null ? { top: nestedMenu.mouseY, left: nestedMenu.mouseX } : undefined}
          hideBackdrop
          slotProps={{
            root: {
              sx: { pointerEvents: 'none' }
            },
            paper: {
              ref: nestedPaperRef,
              sx: { pointerEvents: 'auto' },
              onMouseLeave: (): void => setNestedMenu(null)
            }
          }}
        >
          {nestedMenu.menuItems.map((m, index) => renderMenuItem(m, index, true))}
        </Menu>
      )}
    </Box>
  );
}

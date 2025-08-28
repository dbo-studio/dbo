import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useContextMenu } from '@/hooks';
import locales from '@/locales';
import { IconButton } from '@mui/material';
import { useMemo } from 'react';

export default function ChatOptions() {
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const menu = useMemo<MenuType[]>(
    () => [
      {
        name: locales.history,
        icon: 'history',
        action: (): void => {},
        closeAfterAction: true
      },
      {
        name: locales.delete,
        icon: 'delete',
        action: (): void => {},
        closeAfterAction: true
      },
      {
        name: locales.export,
        icon: 'export',
        action: (): void => {},
        closeAfterAction: true
      }
    ],
    []
  );

  return (
    <>
      <IconButton onClick={handleContextMenu}>
        <CustomIcon type='ellipsisVertical' />
      </IconButton>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </>
  );
}

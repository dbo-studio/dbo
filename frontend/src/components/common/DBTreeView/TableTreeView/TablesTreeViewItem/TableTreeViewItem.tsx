import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import { MenuType } from '@/components/base/ContextMenu/types';
import { TablesTreeViewItemProps } from '@/components/common/DBTreeView/types';
import { useContextMenu } from '@/hooks';
import locales from '@/locales';
import { Box, Tooltip } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';

export default function TableTreeViewItem({ table, onClick }: TablesTreeViewItemProps) {
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const menu: MenuType[] = [
    {
      name: locales.open_data,
      action: () => {}
    },
    {
      name: locales.open_design,
      action: () => {}
    }
  ];

  return (
    <Box onContextMenu={handleContextMenu}>
      <Tooltip title={table}>
        <TreeItem onClick={() => onClick()} itemId={table + '100'} label={table} />
      </Tooltip>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
}

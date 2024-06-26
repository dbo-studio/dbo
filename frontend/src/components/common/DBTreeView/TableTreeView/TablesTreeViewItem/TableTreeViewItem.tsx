import TableTreeViewItemContextMenu from '@/components/common/DBTreeView/TableTreeView/TablesTreeViewItem/TableTreeViewItemContextMenu/TableTreeViewItemContextMenu';
import { TablesTreeViewItemProps } from '@/components/common/DBTreeView/types';
import { useContextMenu } from '@/hooks';
import { Box, Tooltip } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';

export default function TableTreeViewItem({ table, onClick }: TablesTreeViewItemProps) {
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  return (
    <Box onContextMenu={handleContextMenu}>
      <Tooltip title={table}>
        <TreeItem onClick={() => onClick()} itemId={table + '100'} label={table} />
      </Tooltip>
      <TableTreeViewItemContextMenu table={table} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
}

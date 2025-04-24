import { handelRowChangeLog } from '@/core/utils';
import { Divider, Menu, MenuItem } from '@mui/material';
import { useCallback } from 'react';

export default function ContextMenu({
  contextMenuPosition,
  handleClose,
  toggleShowQuickLookEditor,
  getSelectedRows,
  getEditedRows,
  updateEditedRows,
  updateRow,
  toggleDataFetching,
  selectedTabId
}) {
  const handleSetValue = useCallback(
    (value: string | null): void => {
      if (!selectedTabId) return;

      const rows = getSelectedRows();
      for (const row of rows) {
        if (!row.data) continue;
        const newRow = { ...row.data };

        for (const column of row.selectedColumns) {
          const editedRows = handelRowChangeLog(getEditedRows(), row.data, column, row.data[column], value);
          updateEditedRows(editedRows);
          newRow[column] = value;
          updateRow(newRow);
          toggleDataFetching();
        }
      }
      handleClose();
    },
    [selectedTabId, getSelectedRows, getEditedRows]
  );

  return (
    <Menu
      open={Boolean(contextMenuPosition)}
      onClose={handleClose}
      anchorReference='anchorPosition'
      anchorPosition={
        contextMenuPosition ? { top: contextMenuPosition.mouseY, left: contextMenuPosition.mouseX } : undefined
      }
    >
      <MenuItem
        onClick={(): void => {
          toggleShowQuickLookEditor(true);
          handleClose();
        }}
      >
        Quick look editor
      </MenuItem>
      <Divider />
      <MenuItem>
        Set value
        <Menu open={false}>
          <MenuItem onClick={(): void => handleSetValue('')}>Empty</MenuItem>
          <MenuItem onClick={(): void => handleSetValue(null)}>Null</MenuItem>
          <MenuItem onClick={(): void => handleSetValue('@DEFAULT')}>Default</MenuItem>
        </Menu>
      </MenuItem>
    </Menu>
  );
}

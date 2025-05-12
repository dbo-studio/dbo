import CodeEditor from '@/components/base/CodeEditor/CodeEditor.tsx';
import ResizableModal from '@/components/base/Modal/ResizableModal/ResizableModal.tsx';
import type { QuickViewDialogProps } from '@/components/common/DBDataGrid/QuickViewDialog/types';
import { handleRowChangeLog } from '@/core/utils';
import locales from '@/locales';
import { useTableData } from '@/contexts/TableDataContext';
import type { SelectedRow } from '@/store/dataStore/types.ts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';

const getRowValue = (row: SelectedRow): string | undefined => {
  if (!row || !row.selectedColumn) return undefined;
  return row.row[row.selectedColumn];
};

export default function QuickViewDialog({ editable }: QuickViewDialogProps): JSX.Element {
  const [value, setValue] = useState<string | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [row, setRow] = useState<SelectedRow>();
  const { selectedRows, updateRow, editedRows, updateEditedRows } = useTableData();
  const { showQuickLookEditor, toggleShowQuickLookEditor } = useSettingStore();

  const handleClose = (): void => {
    if (!row) {
      toggleShowQuickLookEditor(false);
      return;
    }

    const rowValue = getRowValue(row);
    if (rowValue === undefined || value === rowValue || !editable) {
      toggleShowQuickLookEditor(false);
      return;
    }

    const newEditedRows = handleRowChangeLog(editedRows, row.row, row.selectedColumn, rowValue, value);

    updateEditedRows(newEditedRows);
    const newRow = { ...row.row };
    newRow[row.selectedColumn] = value;
    updateRow(newRow);
    toggleShowQuickLookEditor(false);
  };

  useEffect(() => {
    if (!showQuickLookEditor) return;

    if (selectedRows.length === 0) {
      return;
    }

    const row = selectedRows[selectedRows.length - 1];
    if (!row.selectedColumn) return;

    setRow(row);
    setValue(getRowValue(row));
  }, [showQuickLookEditor, selectedRows]);

  return (
    <ResizableModal
      onClose={handleClose}
      open={showQuickLookEditor}
      title={`${locales.quick_look_editor} : ${row?.selectedColumn ?? ''}`}
      onResize={(width: number, height: number): void => setDimensions({ width, height })}
    >
      <Box display={'flex'} flex={1} flexDirection={'column'}>
        <Box overflow={'auto'} display={'flex'} flex={1}>
          <CodeEditor width={dimensions.width} value={value ?? ''} onChange={(v: string): void => setValue(v)} />
        </Box>
      </Box>
    </ResizableModal>
  );
}

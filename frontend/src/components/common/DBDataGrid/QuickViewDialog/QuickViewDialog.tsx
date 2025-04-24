import CodeEditor from '@/components/base/CodeEditor/CodeEditor.tsx';
import ResizableModal from '@/components/base/Modal/ResizableModal/ResizableModal.tsx';
import type { QuickViewDialogProps } from '@/components/common/DBDataGrid/QuickViewDialog/types';
import { handleRowChangeLog } from '@/core/utils';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { SelectedRow } from '@/store/dataStore/types.ts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { RowType } from '@/types';
import { Box } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';

const getRowValue = (row: SelectedRow): string | undefined => {
  if (!row) return undefined;
  const columns = row.selectedColumns;
  if (columns === undefined || columns.length === 0) return undefined;

  return row.data[columns[columns.length - 1].toString()];
};

const getSelectedColumn = (columns: string[]): string => {
  return columns[columns.length - 1];
};

export default function QuickViewDialog({ editable }: QuickViewDialogProps): JSX.Element {
  const selectedTab = useSelectedTab();
  const [value, setValue] = useState<string | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [row, setRow] = useState<RowType>();
  const { getSelectedRows, updateRow, getEditedRows, updateEditedRows, toggleDataFetching } = useDataStore();
  const { showQuickLookEditor, toggleShowQuickLookEditor } = useSettingStore();

  const handleClose = (): void => {
    const rowValue = getRowValue(row);

    if (rowValue === undefined || !row || value === rowValue || !editable || !selectedTab) {
      toggleShowQuickLookEditor(false);
      return;
    }

    const editedRows = handleRowChangeLog(
      getEditedRows(),
      row.data,
      getSelectedColumn(row.selectedColumns),
      rowValue,
      value
    );

    updateEditedRows(editedRows);
    const newRow = { ...row.data };
    newRow[getSelectedColumn(row.selectedColumns)] = value;
    updateRow(newRow);
    toggleDataFetching();
    toggleShowQuickLookEditor(false);
  };

  useEffect(() => {
    const rows = getSelectedRows();
    if (rows.length === 0 || !showQuickLookEditor) {
      return;
    }

    const row = rows[rows.length - 1];
    const columns = row.selectedColumns;
    if (columns === undefined || columns.length === 0) return;

    setRow(row);
    setValue(getRowValue(row));
  }, [showQuickLookEditor]);

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

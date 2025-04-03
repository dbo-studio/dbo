import CodeEditor from '@/components/base/CodeEditor/CodeEditor.tsx';
import ResizableModal from '@/components/base/Modal/ResizableModal/ResizableModal.tsx';
import type { QuickViewDialogProps } from '@/components/shared/DBDataGrid/QuickViewDialog/types.ts';
import { handelRowChangeLog } from '@/core/utils';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { SelectedRow } from '@/store/dataStore/types.ts';
import type { RowType } from '@/types';
import { Box } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const getRowValue = (row: SelectedRow): string => {
  const columns = row.selectedColumns;
  if (columns === undefined || columns.length === 0) return '';

  return row.data[columns[columns.length - 1].toString()];
};

const getSelectedColumn = (columns: string[]): string => {
  return columns[columns.length - 1];
};

export default function QuickViewDialog({ editable }: QuickViewDialogProps): JSX.Element {
  const selectedTab = useSelectedTab();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getSelectedRows, updateRow, getEditedRows, updateEditedRows } = useDataStore();
  const [value, setValue] = useState<string | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [row, setRow] = useState<RowType>();

  const handleClose = (): void => {
    if (!row || value === getRowValue(row) || !editable) {
      searchParams.delete('quick-look-editor');
      setSearchParams(searchParams);
      return;
    }

    if (!selectedTab) return;

    const editedRows = handelRowChangeLog(
      getEditedRows(selectedTab),
      row.data,
      getSelectedColumn(row.selectedColumns),
      getRowValue(row),
      value
    );

    updateEditedRows(selectedTab, editedRows);
    const newRow = { ...row.data };
    newRow[getSelectedColumn(row.selectedColumns)] = value;
    updateRow(selectedTab, newRow);

    searchParams.delete('quick-look-editor');
    setSearchParams(searchParams);
  };

  useEffect(() => {
    const rows = getSelectedRows();
    if (rows.length === 0 || searchParams.get('quick-look-editor') !== 'true') {
      return;
    }

    const row = rows[rows.length - 1];
    const columns = row.selectedColumns;
    if (columns === undefined || columns.length === 0) return;

    setRow(row);
    setValue(getRowValue(row));
  }, [searchParams.get('quick-look-editor')]);

  return (
    <ResizableModal
      onClose={handleClose}
      open={searchParams.get('quick-look-editor') === 'true'}
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

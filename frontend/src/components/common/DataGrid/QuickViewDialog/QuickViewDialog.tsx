import CodeEditor from '@/components/base/CodeEditor/CodeEditor';
import ResizableModal from '@/components/base/Modal/ResizableModal/ResizableModal.tsx';
import type { QuickViewDialogProps } from '@/components/common/DataGrid/QuickViewDialog/types';
import { handleRowChangeLog } from '@/core/utils';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import type { SelectedRow } from '@/store/dataStore/types.ts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useMemo, useState } from 'react';
import { QuickViewDialogContainerStyled, QuickViewDialogEditorStyled } from './QuickViewDialog.styled';

const getRowValue = (row: SelectedRow): string | undefined => {
  if (!row || !row.selectedColumn) return undefined;
  return row.row[row.selectedColumn] as string | undefined;
};

export default function QuickViewDialog({ editable }: QuickViewDialogProps): JSX.Element {
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  const selectedRows = useDataStore((state) => state.selectedRows);
  const editedRows = useDataStore((state) => state.editedRows);
  const columns = useDataStore((state) => state.columns ?? []);
  const showQuickLookEditor = useSettingStore((state) => state.ui.showQuickLookEditor);

  const updateUI = useSettingStore((state) => state.updateUI);
  const updateRow = useDataStore((state) => state.updateRow);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);

  const activeRow = useMemo((): SelectedRow | undefined => {
    if (!showQuickLookEditor || selectedRows.length === 0) {
      return undefined;
    }

    const row = selectedRows[selectedRows.length - 1];
    if (!row.selectedColumn) {
      return undefined;
    }

    return row;
  }, [showQuickLookEditor, selectedRows]);

  const sourceValue = activeRow ? getRowValue(activeRow) : undefined;
  const activeRowKey = activeRow ? `${activeRow.index}-${activeRow.selectedColumn}` : '';
  const [valueSourceKey, setValueSourceKey] = useState(activeRowKey);
  const [value, setValue] = useState<string | undefined>(sourceValue);

  if (activeRowKey !== valueSourceKey) {
    setValueSourceKey(activeRowKey);
    setValue(sourceValue);
  }

  const handleClose = async (): Promise<void> => {
    if (!activeRow) {
      updateUI({ showQuickLookEditor: false });
      return;
    }

    const rowValue = getRowValue(activeRow);
    if (rowValue === undefined || value === rowValue || !editable) {
      updateUI({ showQuickLookEditor: false });
      return;
    }

    const newEditedRows = handleRowChangeLog(
      editedRows,
      activeRow.row,
      activeRow.selectedColumn,
      rowValue,
      value,
      columns
    );

    await updateEditedRows(newEditedRows);
    const newRow = { ...activeRow.row };
    newRow[activeRow.selectedColumn] = value;
    await updateRow(newRow);
    updateUI({ showQuickLookEditor: false });
  };

  return (
    <ResizableModal
      onClose={() => void handleClose()}
      open={showQuickLookEditor}
      title={`${locales.quick_look_editor} : ${activeRow?.selectedColumn ?? ''}`}
      onResize={(width: number, height: number): void => setDimensions({ width, height })}
    >
      <QuickViewDialogContainerStyled>
        <QuickViewDialogEditorStyled>
          <CodeEditor
            width={dimensions.width}
            value={value?.toString() ?? ''}
            onChange={(v: string): void => setValue(v)}
          />
        </QuickViewDialogEditorStyled>
      </QuickViewDialogContainerStyled>
    </ResizableModal>
  );
}

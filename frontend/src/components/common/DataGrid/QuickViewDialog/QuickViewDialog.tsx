import ResizableModal from '@/components/base/Modal/ResizableModal/ResizableModal.tsx';
import type { QuickViewDialogProps } from '@/components/common/DataGrid/QuickViewDialog/types';
import { DataValueEditor } from '@/components/common/DataGrid/DataValuePanel/DataValuePanel';
import { handleRowChangeLog } from '@/core/utils';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import type { SelectedRow } from '@/store/dataStore/types.ts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useMemo, useState } from 'react';
import { QuickViewDialogContainerStyled, QuickViewDialogEditorStyled } from './QuickViewDialog.styled';

export default function QuickViewDialog({ editable }: QuickViewDialogProps): JSX.Element {
  const [dimensions, setDimensions] = useState({ width: 480, height: 420 });

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

  const column = columns.find((item) => item.name === activeRow?.selectedColumn);
  const sourceValue = activeRow?.selectedColumn ? activeRow.row[activeRow.selectedColumn] : undefined;
  const cellEditable = Boolean(editable) && column?.editable !== false;

  const handleClose = (): void => {
    updateUI({ showQuickLookEditor: false });
  };

  return (
    <ResizableModal
      onClose={handleClose}
      open={showQuickLookEditor}
      title={`${locales.quick_look_editor} : ${activeRow?.selectedColumn ?? ''}`}
      onResize={(width: number, height: number): void => setDimensions({ width, height })}
    >
      <QuickViewDialogContainerStyled>
        <QuickViewDialogEditorStyled>
          {activeRow?.selectedColumn && (
            <DataValueEditor
              value={sourceValue}
              column={column}
              editable={cellEditable}
              width={dimensions.width}
              height={dimensions.height}
              onApply={(next): void => {
                const newEditedRows = handleRowChangeLog(
                  editedRows,
                  activeRow.row,
                  activeRow.selectedColumn,
                  sourceValue,
                  next,
                  columns
                );
                void updateEditedRows(newEditedRows);
                void updateRow({ ...activeRow.row, [activeRow.selectedColumn]: next });
                handleClose();
              }}
            />
          )}
        </QuickViewDialogEditorStyled>
      </QuickViewDialogContainerStyled>
    </ResizableModal>
  );
}

import BottomSheet from '@/components/base/BottomSheet/BottomSheet';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { Button } from '@mui/material';
import { type JSX, useState } from 'react';
import { useCellEditing } from '../../DataGrid/hooks/useCellEditing';
import type { RowEditSheetProps } from '../types';
import { cellToText } from '../utils';
import { RowEditSheetRemoveStyled } from './RowEditSheet.styled';
import RowField from './RowField/RowField';

export default function RowEditSheet({ row, columns, editable, onClose }: RowEditSheetProps): JSX.Element {
  // Same commit path as an inline grid edit, so change tracking and save stay identical.
  const { commitFields } = useCellEditing(row, '');
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);
  const updateRemovedRows = useDataStore((state) => state.updateRemovedRows);
  const [draft, setDraft] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(columns.map((c) => [c.name, cellToText(row[c.name])]))
  );

  const changes = Object.fromEntries(
    columns.filter((c) => draft[c.name] !== cellToText(row[c.name])).map((c) => [c.name, draft[c.name]])
  );
  const hasChanges = Object.keys(changes).length > 0;

  const handleApply = (): void => {
    if (hasChanges) {
      commitFields(changes);
    }
    onClose();
  };

  const handleRemove = (): void => {
    updateSelectedRows([{ index: row.dbo_index, selectedColumn: '', row }], true);
    void updateRemovedRows(undefined);
    onClose();
  };

  return (
    <BottomSheet
      open
      fullHeight
      onClose={onClose}
      title={locales.mobile_row_title}
      actions={
        editable ? (
          <Button
            size='small'
            variant='contained'
            disabled={!hasChanges}
            onClick={handleApply}
            sx={{ minHeight: 32, px: 2 }}
          >
            {locales.mobile_apply}
          </Button>
        ) : undefined
      }
    >
      {columns.map((column) => (
        <RowField
          key={column.name}
          column={column}
          value={draft[column.name] ?? null}
          editable={editable}
          onChange={(value): void => setDraft((prev) => ({ ...prev, [column.name]: value }))}
        />
      ))}
      {editable && (
        <RowEditSheetRemoveStyled>
          <Button fullWidth color='error' onClick={handleRemove}>
            {locales.remove_row}
          </Button>
        </RowEditSheetRemoveStyled>
      )}
    </BottomSheet>
  );
}

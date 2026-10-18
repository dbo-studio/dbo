import locales from '@/locales';
import type { SchemaChangeColumn } from '@/types';
import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import type { JSX } from 'react';

type ColumnFieldsProps = {
  column: SchemaChangeColumn;
  onChange: (column: SchemaChangeColumn) => void;
  /** The name of an existing column identifies it, so only new columns can be renamed. */
  canChangeName: boolean;
  /** A new table also chooses its primary key. */
  withPrimary?: boolean;
};

/** Name, type, default and flags of one column. */
export default function ColumnFields({ column, onChange, canChangeName, withPrimary }: ColumnFieldsProps): JSX.Element {
  return (
    <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <TextField
        size='small'
        label={locales.ai_changes_edit_name}
        value={column.name}
        disabled={!canChangeName}
        onChange={(event) => onChange({ ...column, name: event.target.value })}
        slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-name' } }}
      />
      <TextField
        size='small'
        label={locales.ai_changes_edit_type}
        value={column.type}
        onChange={(event) => onChange({ ...column, type: event.target.value })}
        slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-type' } }}
      />
      <TextField
        size='small'
        label={locales.ai_changes_edit_default}
        value={column.default ?? ''}
        onChange={(event) => onChange({ ...column, default: event.target.value || undefined })}
        slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-default' } }}
      />
      <FormControlLabel
        label={locales.ai_changes_edit_not_null}
        control={
          <Checkbox
            size='small'
            checked={!!column.notNull}
            onChange={(event) => onChange({ ...column, notNull: event.target.checked })}
          />
        }
      />
      {withPrimary && (
        <FormControlLabel
          label={locales.ai_changes_edit_primary}
          control={
            <Checkbox
              size='small'
              checked={!!column.primary}
              onChange={(event) => onChange({ ...column, primary: event.target.checked })}
            />
          }
        />
      )}
    </Stack>
  );
}

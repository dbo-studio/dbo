import locales from '@/locales';
import type { AiChangesetOp, SchemaChangeColumn, SchemaChangeOp } from '@/types';
import { Button, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import { type JSX, useState } from 'react';

type ColumnEditorProps = {
  op: AiChangesetOp;
  onSave: (op: SchemaChangeOp) => void;
  onCancel: () => void;
};

/** Edits the column of an add_column or alter_column op before it is applied. */
export default function ColumnEditor({ op, onSave, onCancel }: ColumnEditorProps): JSX.Element {
  const [column, setColumn] = useState<SchemaChangeColumn>(op.column as SchemaChangeColumn);
  const canChangeName = op.op === 'add_column';

  const save = (): void => {
    onSave({
      op: op.op,
      table: op.table,
      column: { ...column, default: column.default || undefined }
    });
  };

  return (
    <Stack spacing={1} sx={{ py: 0.5 }} data-testid='ai-diff-editor'>
      <Stack direction='row' spacing={1}>
        <TextField
          size='small'
          label={locales.ai_changes_edit_name}
          value={column.name}
          disabled={!canChangeName}
          onChange={(event) => setColumn({ ...column, name: event.target.value })}
          slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-name' } }}
        />
        <TextField
          size='small'
          label={locales.ai_changes_edit_type}
          value={column.type}
          onChange={(event) => setColumn({ ...column, type: event.target.value })}
          slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-type' } }}
        />
        <TextField
          size='small'
          label={locales.ai_changes_edit_default}
          value={column.default ?? ''}
          onChange={(event) => setColumn({ ...column, default: event.target.value })}
          slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-default' } }}
        />
      </Stack>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <FormControlLabel
          sx={{ flex: 1 }}
          label={locales.ai_changes_edit_not_null}
          control={
            <Checkbox
              size='small'
              checked={!!column.notNull}
              onChange={(event) => setColumn({ ...column, notNull: event.target.checked })}
            />
          }
        />
        <Button size='small' variant='text' onClick={onCancel}>
          {locales.cancel}
        </Button>
        <Button
          size='small'
          variant='contained'
          disabled={!column.name || !column.type}
          onClick={save}
          data-testid='ai-diff-edit-save'
        >
          {locales.save}
        </Button>
      </Stack>
    </Stack>
  );
}

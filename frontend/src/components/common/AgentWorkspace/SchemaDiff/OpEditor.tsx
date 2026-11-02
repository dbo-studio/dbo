import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { AiChangesetOp, SchemaChangeColumn, SchemaChangeOp } from '@/types';
import { Button, Checkbox, FormControlLabel, IconButton, MenuItem, Stack, TextField } from '@mui/material';
import { type JSX, useState } from 'react';
import ColumnFields from './ColumnFields';

const ON_DELETE = ['NO ACTION', 'CASCADE', 'SET NULL', 'RESTRICT'];

const NEW_COLUMN: SchemaChangeColumn = { name: '', type: '' };

const toList = (text: string): string[] =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

type OpEditorProps = {
  op: AiChangesetOp;
  onSave: (op: SchemaChangeOp) => void;
  onCancel: () => void;
};

/**
 * Edits a pending op before it is applied. The kind and the table of an op
 * stay as they are; everything else about it can change.
 */
export default function OpEditor({ op, onSave, onCancel }: OpEditorProps): JSX.Element {
  const [draft, setDraft] = useState<SchemaChangeOp>(() => ({
    op: op.op,
    table: op.table,
    name: op.name,
    columns: op.columns,
    column: op.column,
    columnName: op.columnName,
    indexColumns: op.indexColumns,
    unique: op.unique,
    fkColumns: op.fkColumns,
    refTable: op.refTable,
    refColumns: op.refColumns,
    onDelete: op.onDelete
  }));

  const columns = draft.columns ?? [];
  const setColumn = (index: number, column: SchemaChangeColumn): void =>
    setDraft({ ...draft, columns: columns.map((item, i) => (i === index ? column : item)) });

  const complete =
    draft.op === 'create_database' || draft.op === 'create_schema'
      ? !!draft.name
      : draft.op === 'create_table'
        ? columns.length > 0 && columns.every((column) => column.name && column.type)
        : draft.op === 'add_index'
          ? !!draft.indexColumns?.length
          : draft.op === 'add_foreign_key'
            ? !!draft.fkColumns?.length && !!draft.refTable && draft.refColumns?.length === draft.fkColumns.length
            : !!draft.column?.name && !!draft.column.type;

  return (
    <Stack spacing={1} sx={{ py: 0.5 }} data-testid='ai-diff-editor'>
      {(draft.op === 'create_database' || draft.op === 'create_schema') && (
        <TextField
          size='small'
          label={locales.ai_changes_edit_name}
          value={draft.name ?? ''}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-name' } }}
        />
      )}

      {draft.op === 'create_table' && (
        <>
          {columns.map((column, index) => (
            <Stack
              // Rows are edited in place and have no id of their own.
              // eslint-disable-next-line @eslint-react/no-array-index-key
              key={index}
              direction='row'
              sx={{ alignItems: 'center' }}
            >
              <ColumnFields column={column} canChangeName withPrimary onChange={(next) => setColumn(index, next)} />
              <IconButton
                size='small'
                onClick={() => setDraft({ ...draft, columns: columns.filter((_, i) => i !== index) })}
                data-testid='ai-diff-edit-remove-column'
              >
                <CustomIcon type='close' size='xs' />
              </IconButton>
            </Stack>
          ))}
          <Button
            size='small'
            variant='text'
            onClick={() => setDraft({ ...draft, columns: [...columns, NEW_COLUMN] })}
            data-testid='ai-diff-edit-add-column'
          >
            {locales.ai_changes_edit_add_column}
          </Button>
        </>
      )}

      {(draft.op === 'add_column' || draft.op === 'alter_column') && draft.column && (
        <ColumnFields
          column={draft.column}
          canChangeName={draft.op === 'add_column'}
          onChange={(column) => setDraft({ ...draft, column })}
        />
      )}

      {draft.op === 'add_index' && (
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            size='small'
            label={locales.ai_changes_edit_columns}
            value={(draft.indexColumns ?? []).join(', ')}
            onChange={(event) => setDraft({ ...draft, indexColumns: toList(event.target.value) })}
            slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-index-columns' } }}
          />
          <FormControlLabel
            label={locales.ai_changes_edit_unique}
            control={
              <Checkbox
                size='small'
                checked={!!draft.unique}
                onChange={(event) => setDraft({ ...draft, unique: event.target.checked })}
                slotProps={{ input: { 'data-testid': 'ai-diff-edit-unique' } as object }}
              />
            }
          />
        </Stack>
      )}

      {draft.op === 'add_foreign_key' && (
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
          <TextField
            size='small'
            label={locales.ai_changes_edit_columns}
            value={(draft.fkColumns ?? []).join(', ')}
            onChange={(event) => setDraft({ ...draft, fkColumns: toList(event.target.value) })}
            slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-fk-columns' } }}
          />
          <TextField
            size='small'
            label={locales.ai_changes_edit_ref_table}
            value={draft.refTable ?? ''}
            onChange={(event) => setDraft({ ...draft, refTable: event.target.value })}
            slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-ref-table' } }}
          />
          <TextField
            size='small'
            label={locales.ai_changes_edit_ref_columns}
            value={(draft.refColumns ?? []).join(', ')}
            onChange={(event) => setDraft({ ...draft, refColumns: toList(event.target.value) })}
            slotProps={{ htmlInput: { 'data-testid': 'ai-diff-edit-ref-columns' } }}
          />
          <TextField
            select
            size='small'
            label={locales.ai_changes_edit_on_delete}
            value={draft.onDelete ?? ''}
            onChange={(event) => setDraft({ ...draft, onDelete: event.target.value || undefined })}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value=''>-</MenuItem>
            {ON_DELETE.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      <Stack direction='row' spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button size='small' variant='text' onClick={onCancel}>
          {locales.cancel}
        </Button>
        <Button
          size='small'
          variant='contained'
          disabled={!complete}
          onClick={() => onSave(draft)}
          data-testid='ai-diff-edit-save'
        >
          {locales.save}
        </Button>
      </Stack>
    </Stack>
  );
}

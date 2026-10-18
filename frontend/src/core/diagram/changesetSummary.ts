import locales from '@/locales';
import type { SchemaChangeOp } from '@/types';

export type ChangesetLine = { label: string; detail: string };

/** Human-readable one-liners for an agent-proposed changeset. */
export const summarizeChangeset = (ops: SchemaChangeOp[]): ChangesetLine[] =>
  ops.map((op) => {
    switch (op.op) {
      case 'create_table':
        return {
          label: locales.ai_op_create_table,
          detail: `${op.table} (${(op.columns ?? []).map((column) => column.name).join(', ')})`
        };
      case 'add_column':
        return {
          label: locales.ai_op_add_column,
          detail: `${op.table}.${op.column?.name ?? ''} ${op.column?.type ?? ''}`.trim()
        };
      case 'alter_column':
        return {
          label: locales.ai_op_alter_column,
          detail: `${op.table}.${op.column?.name ?? ''} ${op.column?.type ?? ''}`.trim()
        };
      case 'drop_column':
        return { label: locales.ai_op_drop_column, detail: `${op.table}.${op.columnName ?? ''}` };
      case 'add_index':
        return {
          label: locales.ai_op_add_index,
          detail: `${op.table}(${(op.indexColumns ?? []).join(', ')})${op.unique ? ' unique' : ''}`
        };
      case 'add_foreign_key':
        return {
          label: locales.ai_op_add_foreign_key,
          detail: `${op.table}(${(op.fkColumns ?? []).join(', ')}) → ${op.refTable}(${(op.refColumns ?? []).join(', ')})`
        };
    }
  });

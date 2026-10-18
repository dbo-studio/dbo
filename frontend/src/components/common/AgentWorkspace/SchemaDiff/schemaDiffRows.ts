import type { DiagramGraph } from '@/core/diagram/types';
import type { AiChangesetOp, SchemaChangeColumn } from '@/types';

export type DiffRow = { sign: '+' | '~' | '−'; text: string };

const columnText = (column: SchemaChangeColumn): string =>
  [
    column.name,
    column.type,
    column.primary && 'PRIMARY KEY',
    column.notNull && 'NOT NULL',
    column.default !== undefined && `DEFAULT ${column.default}`
  ]
    .filter(Boolean)
    .join(' ');

/** The rows an op adds to, changes in or removes from its table; `before` is the live schema. */
export const diffRows = (op: AiChangesetOp, before: DiagramGraph | undefined): DiffRow[] => {
  const liveColumn = (name?: string) =>
    before?.nodes.find((node) => node.id === op.tableId)?.columns.find((column) => column.name === name);

  switch (op.op) {
    case 'create_table':
      return (op.columns ?? []).map((column) => ({ sign: '+', text: columnText(column) }));
    case 'add_column':
      return [{ sign: '+', text: columnText(op.column as SchemaChangeColumn) }];
    case 'alter_column': {
      const column = op.column as SchemaChangeColumn;
      const was = liveColumn(column.name);
      return [{ sign: '~', text: was ? `${columnText(column)}  (was ${was.dataType})` : columnText(column) }];
    }
    case 'drop_column': {
      const was = liveColumn(op.columnName);
      return [{ sign: '−', text: [op.columnName, was?.dataType].filter(Boolean).join(' ') }];
    }
    case 'add_index':
      return [{ sign: '+', text: `${op.unique ? 'UNIQUE ' : ''}INDEX (${(op.indexColumns ?? []).join(', ')})` }];
    case 'add_foreign_key':
      return [
        {
          sign: '+',
          text: `FOREIGN KEY (${(op.fkColumns ?? []).join(', ')}) → ${op.refTable}(${(op.refColumns ?? []).join(', ')})${
            op.onDelete ? ` ON DELETE ${op.onDelete}` : ''
          }`
        }
      ];
  }
};

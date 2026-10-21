import type { AiChangesetOp, SchemaChangeColumn, TableStructure } from '@/types';

export type DiffRow = { sign: '+' | '~' | '−'; text: string };

type ColumnLike = { name: string; primary?: boolean; notNull?: boolean; default?: string };

const definition = (column: ColumnLike & { type?: string; dataType?: string }): string =>
  [
    column.name,
    column.type ?? column.dataType,
    column.primary && 'PRIMARY KEY',
    column.notNull && 'NOT NULL',
    column.default && `DEFAULT ${column.default}`
  ]
    .filter(Boolean)
    .join(' ');

const liveDefinition = (column: TableStructure['columns'][number]): string =>
  definition({ ...column, primary: column.isPrimaryKey });

/** The lines that describe an existing table: its columns, indexes and foreign keys. */
export const structureLines = (structure: TableStructure): string[] => [
  ...structure.columns.map(liveDefinition),
  ...structure.indexes.map(
    (index) => `${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} (${index.columns.join(', ')})`
  ),
  ...structure.foreignKeys.map(
    (fk) =>
      `FOREIGN KEY ${fk.name} (${fk.columns.join(', ')}) → ${fk.refTable}(${fk.refColumns.join(', ')})${
        fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ''
      }`
  )
];

/** The rows an op adds to, changes in or removes from its table; `before` is the table as it is now. */
export const diffRows = (op: AiChangesetOp, before: TableStructure | undefined): DiffRow[] => {
  const live = (name?: string) => before?.columns.find((column) => column.name === name);

  switch (op.op) {
    case 'write':
      return [{ sign: '~', text: `${op.sql} — ${op.affectedRows ?? 0} ${op.affectedRows === 1 ? 'row' : 'rows'}` }];
    case 'undo':
      return [{ sign: '−', text: op.sql ?? '' }];
    case 'create_database':
      return [{ sign: '+', text: `DATABASE ${op.name}` }];
    case 'create_schema':
      return [{ sign: '+', text: `SCHEMA ${op.name}` }];
    case 'create_table':
      return (op.columns ?? []).map((column) => ({ sign: '+', text: definition(column) }));
    case 'add_column':
      return [{ sign: '+', text: definition(op.column as SchemaChangeColumn) }];
    case 'alter_column': {
      const column = op.column as SchemaChangeColumn;
      const was = live(column.name);
      return [{ sign: '~', text: was ? `${definition(column)}  (was ${liveDefinition(was)})` : definition(column) }];
    }
    case 'drop_column': {
      const was = live(op.columnName);
      return [{ sign: '−', text: was ? liveDefinition(was) : (op.columnName ?? '') }];
    }
    case 'add_index': {
      const text = `${op.unique ? 'UNIQUE ' : ''}INDEX (${(op.indexColumns ?? []).join(', ')})`;
      const same = before?.indexes.find((index) => index.columns.join() === (op.indexColumns ?? []).join());
      return [{ sign: '+', text: same ? `${text}  (${same.name} already covers these columns)` : text }];
    }
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

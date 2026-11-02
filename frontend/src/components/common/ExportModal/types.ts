/** A whole object chosen from the object tree (not the rows a grid shows). */
export type ExportTarget = {
  kind: 'table' | 'schema' | 'database';
  database: string;
  schema: string;
  table?: string;
};

export type ExportModalProps = {
  show: boolean;
  connectionId: number;
  /** Grid export: the rows currently shown (needs query and table). */
  query?: string;
  table?: string;
  /** Tree export: the whole table, schema or database. Wins over query/table. */
  target?: ExportTarget;
  onClose: () => void;
};

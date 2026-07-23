export const SQLITE_LIFECYCLE_FIELDS = {
  tableName: 'name',
  columnName: 'name',
  columnType: 'type',
  keyName: 'name',
  keyColumns: 'columns',
  keyType: 'type',
  fkName: 'constraint_name',
  fkSourceColumns: 'ref_columns',
  fkTargetTable: 'target_table',
  fkTargetColumns: 'target_columns',
  viewName: 'name',
  viewQuery: 'query'
} as const;

export const SQLITE_LIFECYCLE_TABS = {
  columns: 'table_columns',
  keys: 'table_keys',
  foreignKeys: 'table_foreign_keys',
  view: 'view'
} as const;

export const SQLITE_LIFECYCLE_PREVIEW = {
  createTable: /CREATE TABLE/i,
  addColumn: /CREATE TABLE/i,
  primaryKey: /PRIMARY KEY/i,
  foreignKey: /FOREIGN KEY|REFERENCES/i,
  createView: /CREATE VIEW/i,
  recreateView: /DROP VIEW|CREATE VIEW/i
} as const;

export function sqliteLifecycleNames(suffix: string): {
  connectionName: string;
  dbPath: string;
  usersTable: string;
  postsTable: string;
  viewName: string;
  fkName: string;
} {
  return {
    connectionName: `e2e-sqlite-lifecycle-${suffix}`,
    dbPath: `/tmp/dbo-e2e-lifecycle-${suffix}.db`,
    usersTable: `users_${suffix}`,
    postsTable: `posts_${suffix}`,
    viewName: `v_posts_${suffix}`,
    fkName: `fk_posts_${suffix}`
  };
}

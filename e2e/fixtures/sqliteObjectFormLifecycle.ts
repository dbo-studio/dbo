export const SQLITE_LIFECYCLE_FIELDS = {
  tableName: 'name',
  tableStrict: 'strict',
  tableWithoutRowid: 'without_rowid',
  tableTemporary: 'temporary',
  columnName: 'name',
  columnType: 'type',
  columnNotNull: 'not_null',
  columnDefault: 'dflt_value',
  keyName: 'name',
  keyColumns: 'columns',
  keyType: 'type',
  fkName: 'constraint_name',
  fkSourceColumns: 'ref_columns',
  fkTargetTable: 'target_table',
  fkTargetColumns: 'target_columns',
  fkOnUpdate: 'update_action',
  fkOnDelete: 'delete_action',
  fkDeferrable: 'is_deferrable',
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
  recreateView: /DROP VIEW|CREATE VIEW/i,
  // SQLite recreates the table; preview must keep real columns + copy data (not FK/PK-only DDL).
  dropColumn: /CREATE TABLE[\s\S]*"id"[\s\S]*"email"[\s\S]*INSERT INTO/i,
  dropForeignKey: /CREATE TABLE[\s\S]*"user_id"[\s\S]*INSERT INTO/i,
  addForeignKey: /CREATE TABLE[\s\S]*"user_id"[\s\S]*FOREIGN KEY[\s\S]*ON UPDATE CASCADE[\s\S]*ON DELETE CASCADE[\s\S]*INSERT INTO|CREATE TABLE[\s\S]*"user_id"[\s\S]*FOREIGN KEY[\s\S]*ON DELETE CASCADE[\s\S]*ON UPDATE CASCADE[\s\S]*INSERT INTO/i,
  editForeignKey:
    /CREATE TABLE[\s\S]*FOREIGN KEY[\s\S]*ON DELETE SET NULL[\s\S]*INSERT INTO|CREATE TABLE[\s\S]*FOREIGN KEY[\s\S]*SET NULL[\s\S]*INSERT INTO/i,
  createStrictWithoutRowid:
    /CREATE TABLE[\s\S]*PRIMARY KEY[\s\S]*WITHOUT ROWID[\s\S]*STRICT|CREATE TABLE[\s\S]*PRIMARY KEY[\s\S]*STRICT[\s\S]*WITHOUT ROWID/i,
  deferrableForeignKey: /FOREIGN KEY[\s\S]*DEFERRABLE/i,
  renameTable: /RENAME TO|CREATE TABLE/i,
  setNotNull: /CREATE TABLE[\s\S]*"email"[\s\S]*NOT NULL[\s\S]*INSERT INTO/i,
  setDefault: /CREATE TABLE[\s\S]*"email"[\s\S]*DEFAULT[\s\S]*INSERT INTO/i,
  alterColumnType: /CREATE TABLE[\s\S]*"email"[\s\S]*BLOB[\s\S]*INSERT INTO/i,
  addUnique: /CREATE TABLE[\s\S]*"email"[\s\S]*UNIQUE[\s\S]*INSERT INTO|CREATE TABLE[\s\S]*UNIQUE[\s\S]*"email"[\s\S]*INSERT INTO/i,
  dropKey: /CREATE TABLE[\s\S]*"email"[\s\S]*INSERT INTO/i
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

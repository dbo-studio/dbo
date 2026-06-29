export const MYSQL_LIFECYCLE_FIELDS = {
  databaseName: 'datname',
  tableName: 'relname',
  columnName: 'column_name',
  columnType: 'data_type',
  keyName: 'constraint_name',
  keyColumns: 'ref_columns',
  keyType: 'constraint_type',
  fkName: 'constraint_name',
  fkSourceColumns: 'ref_columns',
  fkTargetTable: 'target_table',
  fkTargetColumns: 'target_columns',
  indexName: 'index_name',
  indexColumns: 'ref_columns',
  viewName: 'name',
  viewQuery: 'query'
} as const;

export const MYSQL_LIFECYCLE_TABS = {
  database: 'database',
  columns: 'table_columns',
  keys: 'table_keys',
  foreignKeys: 'table_foreign_keys',
  indexes: 'table_indexes',
  view: 'view'
} as const;

export const MYSQL_LIFECYCLE_PREVIEW = {
  createDatabase: /CREATE DATABASE/i,
  createTable: /CREATE TABLE/i,
  addColumn: /ADD COLUMN/i,
  primaryKey: /PRIMARY KEY/i,
  foreignKey: /FOREIGN KEY/i,
  createIndex: /CREATE INDEX/i,
  createView: /CREATE VIEW/i,
  replaceView: /CREATE OR REPLACE VIEW/i
} as const;

export function mysqlLifecycleNames(suffix: string): {
  connectionName: string;
  databaseName: string;
  usersTable: string;
  postsTable: string;
  viewName: string;
  fkName: string;
  indexName: string;
} {
  return {
    connectionName: `e2e-mysql-lifecycle-${suffix}`,
    databaseName: `e2e_db_${suffix}`,
    usersTable: `users_${suffix}`,
    postsTable: `posts_${suffix}`,
    viewName: `v_posts_${suffix}`,
    fkName: `fk_posts_${suffix}`,
    indexName: `idx_posts_user_${suffix}`
  };
}

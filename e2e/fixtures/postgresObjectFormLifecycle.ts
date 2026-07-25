export const POSTGRES_LIFECYCLE_FIELDS = {
  databaseName: 'datname',
  databaseComment: 'description',
  schemaName: 'nspname',
  schemaComment: 'description',
  tableName: 'relname',
  tableComment: 'description',
  columnName: 'column_name',
  columnType: 'data_type',
  columnPrimary: 'primary',
  columnNotNull: 'not_null',
  columnDefault: 'column_default',
  columnComment: 'comment',
  fkName: 'constraint_name',
  fkSourceColumns: 'ref_columns',
  fkTargetTable: 'target_table',
  fkTargetColumns: 'target_columns',
  keyName: 'name',
  keyColumns: 'columns',
  keyPrimary: 'primary',
  viewName: 'name',
  viewQuery: 'query',
  matViewName: 'name',
  matViewQuery: 'query'
} as const;

export const POSTGRES_LIFECYCLE_TABS = {
  database: 'database',
  schema: 'schema',
  columns: 'table_columns',
  foreignKeys: 'table_foreign_keys',
  keys: 'table_keys',
  view: 'view',
  materializedView: 'materialized_view'
} as const;

export const POSTGRES_LIFECYCLE_PREVIEW = {
  createDatabase: /CREATE DATABASE/i,
  commentOnDatabase: /COMMENT ON DATABASE/i,
  createSchema: /CREATE SCHEMA/i,
  alterSchema: /ALTER SCHEMA/i,
  createTable: /CREATE TABLE/i,
  addColumn: /ADD COLUMN/i,
  foreignKey: /FOREIGN KEY|REFERENCES/i,
  dropConstraint: /DROP CONSTRAINT/i,
  setNotNull: /SET NOT NULL/i,
  setDefault: /SET DEFAULT/i,
  commentOnColumn: /COMMENT ON COLUMN/i,
  dropColumn: /DROP COLUMN/i,
  commentOnTable: /COMMENT ON TABLE/i,
  renameTable: /ALTER TABLE.*RENAME TO/i,
  alterColumnType: /ALTER COLUMN.*TYPE/i,
  addPrimaryKey: /ADD CONSTRAINT.*PRIMARY KEY/i,
  addUnique: /ADD CONSTRAINT.*UNIQUE/i,
  dropKey: /DROP CONSTRAINT/i,
  createView: /CREATE VIEW/i,
  replaceView: /DROP VIEW/i,
  createMaterializedView: /CREATE MATERIALIZED VIEW/i,
  dropMaterializedView: /DROP MATERIALIZED VIEW/i
} as const;

export function postgresLifecycleNames(suffix: string): {
  connectionName: string;
  databaseName: string;
  usersTable: string;
  postsTable: string;
  viewName: string;
} {
  return {
    connectionName: `e2e-pg-lifecycle-${suffix}`,
    databaseName: `e2e_db_${suffix}`,
    usersTable: `users_${suffix}`,
    postsTable: `posts_${suffix}`,
    viewName: `v_posts_${suffix}`
  };
}

export function postgresExtendedNames(suffix: string): {
  connectionName: string;
  databaseName: string;
  schemaName: string;
  renamedSchemaName: string;
  tableName: string;
  viewName: string;
  matViewName: string;
} {
  return {
    connectionName: `e2e-pg-extended-${suffix}`,
    databaseName: `e2e_db_${suffix}`,
    schemaName: `e2e_schema_${suffix}`,
    renamedSchemaName: `e2e_schema_renamed_${suffix}`,
    tableName: `items_${suffix}`,
    viewName: `v_items_${suffix}`,
    matViewName: `mv_items_${suffix}`
  };
}

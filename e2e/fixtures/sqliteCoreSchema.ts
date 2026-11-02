export const SQLITE_CORE_TABS = {
  indexes: 'table_indexes',
  triggers: 'table_triggers',
  checks: 'table_checks'
} as const;

export const SQLITE_CORE_FIELDS = {
  indexName: 'name',
  indexColumns: 'columns',
  indexUnique: 'unique',
  indexOrder: 'order',
  triggerName: 'name',
  triggerTiming: 'timing',
  triggerEvent: 'event',
  triggerWhen: 'when',
  triggerBody: 'body',
  checkName: 'name',
  checkExpression: 'expression'
} as const;

export const SQLITE_CORE_PREVIEW = {
  createIndex: /CREATE INDEX/i,
  createUniqueIndex: /CREATE UNIQUE INDEX/i,
  dropIndex: /DROP INDEX/i,
  createTrigger: /CREATE TRIGGER/i,
  dropTrigger: /DROP TRIGGER/i,
  // Checks need a table recreate; indexes and triggers must be created again afterwards.
  recreateKeepsIndex: /CREATE TABLE[\s\S]*INSERT INTO[\s\S]*DROP TABLE[\s\S]*CREATE (UNIQUE )?INDEX/i,
  recreateKeepsTrigger: /DROP TABLE[\s\S]*CREATE TRIGGER/i
} as const;

export function sqliteCoreSchemaNames(suffix: string): {
  connectionName: string;
  dbPath: string;
  usersTable: string;
  indexName: string;
  triggerName: string;
  checkName: string;
} {
  return {
    connectionName: `e2e-sqlite-core-${suffix}`,
    dbPath: `/tmp/dbo-e2e-core-${suffix}.db`,
    usersTable: `users_${suffix}`,
    indexName: `idx_users_email_${suffix}`,
    triggerName: `trg_users_${suffix}`,
    checkName: `chk_email_${suffix}`
  };
}

/** Field ids, tab ids, preview patterns and names for MySQL triggers and routines. */
export const MYSQL_CORE_TABS = {
  triggers: 'table_triggers',
  checks: 'table_checks',
  indexes: 'table_indexes',
  event: 'event',
  function: 'function',
  procedure: 'procedure'
} as const;

export const MYSQL_CORE_FIELDS = {
  triggerName: 'name',
  triggerTiming: 'timing',
  triggerEvent: 'event',
  triggerBody: 'body',
  checkName: 'name',
  checkExpression: 'expression',
  indexName: 'index_name',
  eventName: 'name',
  eventSchedule: 'schedule',
  eventStatus: 'status',
  eventPreserve: 'preserve',
  eventBody: 'body',
  routineName: 'name',
  routineParameters: 'parameters',
  routineReturns: 'returns',
  routineDeterministic: 'deterministic',
  routineBody: 'body'
} as const;

export const MYSQL_CORE_PREVIEW = {
  createTrigger: /CREATE TRIGGER[\s\S]*BEFORE INSERT ON[\s\S]*FOR EACH ROW SET NEW\.email = LOWER\(NEW\.email\)/i,
  dropTrigger: /DROP TRIGGER/i,
  addUnique: /ADD CONSTRAINT `[^`]+` UNIQUE \(`email`\)/i,
  dropUnique: /DROP INDEX/i,
  addCheck: /ADD CONSTRAINT `[^`]+` CHECK \(CHAR_LENGTH\(email\) > 3\)/i,
  dropCheck: /DROP CHECK|DROP CONSTRAINT/i,
  createFunction: /CREATE FUNCTION[\s\S]*\(a INT\) RETURNS INT DETERMINISTIC RETURN a \+ 1/i,
  createProcedure: /CREATE PROCEDURE[\s\S]*\(IN a INT\) BEGIN SELECT a; END/i,
  createEvent: /CREATE EVENT[\s\S]*ON SCHEDULE EVERY 1 DAY ON COMPLETION PRESERVE DISABLE DO /i,
  dropEvent: /DROP EVENT/i,
  dropFunction: /DROP FUNCTION/i,
  dropProcedure: /DROP PROCEDURE/i
} as const;

export function mysqlCoreSchemaNames(suffix: string): {
  connectionName: string;
  databaseName: string;
  usersTable: string;
  triggerName: string;
  functionName: string;
  procedureName: string;
  eventName: string;
  renamedEventName: string;
} {
  return {
    connectionName: `e2e-mysql-core-${suffix}`,
    databaseName: `e2e_core_${suffix}`,
    usersTable: `users_${suffix}`,
    triggerName: `trg_${suffix}`,
    functionName: `fn_${suffix}`,
    procedureName: `proc_${suffix}`,
    eventName: `ev_${suffix}`,
    renamedEventName: `ev_renamed_${suffix}`
  };
}

/** Backend rejection messages for invalid input (never a silent skip). */
export const MYSQL_CORE_ERRORS = {
  unsafeParameters: /parameters must not contain/i,
  triggerBodyRequired: /body is required/i
} as const;

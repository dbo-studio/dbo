/** Field ids, tab ids, preview patterns and names for PG core-schema objects. */
export const PG_CORE_TABS = {
  columns: 'table_columns',
  indexes: 'table_indexes',
  checks: 'table_checks',
  triggers: 'table_triggers',
  tableSequences: 'table_sequence',
  sequence: 'sequence',
  type: 'type',
  function: 'function',
  procedure: 'procedure',
  materializedView: 'materialized_view'
} as const;

export const PG_CORE_FIELDS = {
  indexName: 'name',
  indexUnique: 'unique',
  indexMethod: 'method',
  indexColumns: 'columns',
  indexWhere: 'where',
  checkName: 'name',
  checkExpression: 'expression',
  triggerName: 'name',
  triggerTiming: 'timing',
  triggerEvents: 'events',
  triggerOrientation: 'orientation',
  triggerFunction: 'function',
  triggerWhen: 'when',
  sequenceName: 'name',
  sequenceStart: 'start_value',
  sequenceIncrement: 'increment_by',
  sequenceOwnedBy: 'owned_by',
  typeName: 'name',
  typeValues: 'values',
  routineName: 'name',
  routineParameters: 'parameters',
  routineReturns: 'returns',
  routineBody: 'body',
  columnName: 'column_name',
  columnType: 'data_type',
  matViewName: 'name',
  matViewComment: 'comment',
  matViewQuery: 'query'
} as const;

export const PG_CORE_PREVIEW = {
  createUniqueIndex: /CREATE UNIQUE INDEX[\s\S]*USING btree[\s\S]*\("email"\)/i,
  createHashIndex: /CREATE INDEX[\s\S]*USING hash/i,
  dropIndex: /DROP INDEX/i,
  addCheck: /ADD CONSTRAINT[\s\S]*CHECK \(length\(email\) > 3\)/i,
  dropConstraint: /DROP CONSTRAINT/i,
  createTrigger:
    /CREATE TRIGGER[\s\S]*BEFORE INSERT[\s\S]*FOR EACH ROW[\s\S]*EXECUTE FUNCTION "public"\."[a-z0-9_]+"\(\)/i,
  dropTrigger: /DROP TRIGGER/i,
  createFunction: /CREATE FUNCTION[\s\S]*RETURNS trigger[\s\S]*LANGUAGE plpgsql/i,
  replaceFunction: /CREATE OR REPLACE FUNCTION/i,
  createProcedure: /CREATE PROCEDURE[\s\S]*LANGUAGE plpgsql/i,
  createSequence: /CREATE SEQUENCE[\s\S]*INCREMENT BY 5[\s\S]*START WITH 10/i,
  alterSequence: /ALTER SEQUENCE[\s\S]*INCREMENT BY 7/i,
  createOwnedSequence: /CREATE SEQUENCE[\s\S]*OWNED BY "public"\."[a-z0-9_]+"\."id"/i,
  dropSequence: /DROP SEQUENCE/i,
  createEnum: /CREATE TYPE[\s\S]*AS ENUM \('sad', 'ok'\)/i,
  addEnumValue: /ALTER TYPE[\s\S]*ADD VALUE 'happy'/i,
  addEnumColumn: /ADD COLUMN "mood" "public"\."[a-z0-9_]+"/i,
  editMatViewRecreate: /DROP MATERIALIZED VIEW[\s\S]*CREATE MATERIALIZED VIEW/i,
  editMatViewComment: /COMMENT ON MATERIALIZED VIEW/i,
  refreshMatView: /REFRESH MATERIALIZED VIEW/i
} as const;

export function postgresCoreSchemaNames(suffix: string): {
  connectionName: string;
  databaseName: string;
  usersTable: string;
  indexName: string;
  checkName: string;
  triggerFunction: string;
  triggerName: string;
  procedureName: string;
  sequenceName: string;
  tableSequenceName: string;
  enumName: string;
  matViewName: string;
} {
  return {
    connectionName: `e2e-pg-core-${suffix}`,
    databaseName: `e2e_core_${suffix}`,
    usersTable: `users_${suffix}`,
    indexName: `ix_email_${suffix}`,
    checkName: `ck_email_${suffix}`,
    triggerFunction: `trg_fn_${suffix}`,
    triggerName: `trg_${suffix}`,
    procedureName: `proc_${suffix}`,
    sequenceName: `seq_${suffix}`,
    tableSequenceName: `tseq_${suffix}`,
    enumName: `mood_${suffix}`,
    matViewName: `mv_${suffix}`
  };
}

/** Backend rejection messages for invalid input (never a silent skip). */
export const PG_CORE_ERRORS = {
  unsafeWhere: /WHERE must be a single SQL expression/i,
  unsafeCheck: /expression must be a single SQL expression/i,
  unsafeTriggerWhen: /WHEN must be a single SQL expression/i,
  unsafeParameters: /parameters must not contain/i,
  badSequenceNumber: /increment must be an integer/i,
  enumRemoval: /can only be appended/i
} as const;

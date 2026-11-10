// Which shared e2e suite must run on which engine. Checked by scripts/check-coverage.mjs (npm run check:coverage).
// A required pair with no spec and no EXEMPT entry fails CI. Reason "TODO..." = known gap, still to test.
// Replace a TODO only with a real reason the engine cannot support the feature, or add the spec and delete the entry.
// Engines: pg (tests/pg + tests/shared), mysql, sqlite, mssql, clickhouse. Redis/Mongo have their own specs.
const SQL = ["pg","mysql","sqlite","mssql","clickhouse"];

export const REQUIRED = {
  defineHostSqlTunnelTests: ["mssql", "clickhouse"],
  defineSavedHistoryTests: ["mssql", "clickhouse"],
  defineGeneratedColumnApiTests: ["mysql", "mssql", "clickhouse"],
  defineHostSqlExtraTests: ["mssql", "clickhouse"],
  defineEditorContextTests: ["mssql", "clickhouse"],
  defineClickhouseStorageTests: ["clickhouse"],
  defineMssqlObjectsTests: ["mssql"],
  defineHostSqlGeneratedColumnTests: ["mssql", "clickhouse"],
  defineClickhouseObjectsTests: ["clickhouse"],
  defineBackgroundJobsTests: SQL,
  defineBackupConsoleTests: SQL,
  defineBackupScheduleTests: SQL,
  defineBackupSealTests: SQL,
  defineBackupTests: SQL,
  defineBackupUiTests: SQL,
  defineConnectionsTests: SQL,
  defineDashboardSharingTests: SQL,
  defineDataBrowserTests: SQL,
  defineDataGridContextMenuTests: SQL,
  defineExportScopeTests: SQL,
  defineGeneratedColumnTests: SQL,
  defineHostSqlTests: ["mssql","clickhouse"],
  defineImportExportTests: SQL,
  defineMultiColumnFkTests: SQL,
  defineQueryGuardsTests: SQL,
  defineQueryStatusBarTests: SQL,
  defineReportFilterTests: SQL,
  defineSafeModeTests: SQL,
};

export const EXEMPT = {
  "defineBackgroundJobsTests": {
    "sqlite": "TODO: not tested on this engine yet. Add the spec or replace with the reason it is unsupported",
  },
  "defineDashboardSharingTests": {
    "sqlite": "TODO: not tested on this engine yet. Add the spec or replace with the reason it is unsupported"
  },
  "defineGeneratedColumnTests": {
    "mysql": "unsupported in the Object Form (no generated field outside PostgreSQL/SQLite); behaviour covered by defineGeneratedColumnApiTests",
    "mssql": "covered by defineHostSqlGeneratedColumnTests (computed column through the Object Form) and defineGeneratedColumnApiTests",
    "clickhouse": "covered by defineHostSqlGeneratedColumnTests (MATERIALIZED column through the Object Form) and defineGeneratedColumnApiTests"
  },
  "defineMultiColumnFkTests": {
    "mssql": "covered at API level by defineHostSqlExtraTests (Object Form, no UI run)",
    "clickhouse": "unsupported: ClickHouse has no foreign keys; refusal asserted in defineHostSqlExtraTests"
  },
};

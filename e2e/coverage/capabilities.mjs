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
  "defineBackupConsoleTests": {
    "mssql": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)",
    "clickhouse": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)"
  },
  "defineBackupScheduleTests": {
    "mssql": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)",
    "clickhouse": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)"
  },
  "defineBackupSealTests": {
    "mssql": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)",
    "clickhouse": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)"
  },
  "defineBackupTests": {
    "mssql": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)",
    "clickhouse": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)"
  },
  "defineBackupUiTests": {
    "mssql": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)",
    "clickhouse": "built-in dump and statement-replay restore, covered at API level by defineHostSqlExtraTests (native-tool UI suite does not apply)"
  },
  "defineDashboardSharingTests": {
    "sqlite": "TODO: not tested on this engine yet. Add the spec or replace with the reason it is unsupported"
  },
  "defineDataGridContextMenuTests": {
    "clickhouse": "unsupported: ClickHouse grid is read-only (HOST_SQL.editable=false), menu edit actions do not apply"
  },
  "defineExportScopeTests": {
    "mssql": "covered at API level by defineHostSqlExtraTests (no UI run yet)",
    "clickhouse": "covered at API level by defineHostSqlExtraTests (no UI run yet)"
  },
  "defineGeneratedColumnTests": {
    "mysql": "unsupported in the Object Form (no generated field outside PostgreSQL/SQLite); behaviour covered by defineGeneratedColumnApiTests",
    "mssql": "unsupported in the Object Form (no generated field outside PostgreSQL/SQLite); behaviour covered by defineGeneratedColumnApiTests",
    "clickhouse": "unsupported in the Object Form (no generated field outside PostgreSQL/SQLite); behaviour covered by defineGeneratedColumnApiTests"
  },
  "defineImportExportTests": {
    "mssql": "covered at API level by defineHostSqlExtraTests (no UI run yet)",
    "clickhouse": "covered at API level by defineHostSqlExtraTests (no UI run yet)"
  },
  "defineMultiColumnFkTests": {
    "mssql": "covered at API level by defineHostSqlExtraTests (Object Form, no UI run)",
    "clickhouse": "unsupported: ClickHouse has no foreign keys; refusal asserted in defineHostSqlExtraTests"
  },
  "defineQueryStatusBarTests": {
    "clickhouse": "TODO: not tested on this engine yet. Add the spec or replace with the reason it is unsupported"
  },
  "defineSafeModeTests": {
    "mssql": "covered at API level by defineHostSqlExtraTests (no UI run yet)",
    "clickhouse": "covered at API level by defineHostSqlExtraTests (no UI run yet)"
  }
};

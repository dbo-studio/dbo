import { expect, test } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { apiRoute, pendingResponse } from "./network";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import { withConnectionCleanup } from "./safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../pages";

function labelOf(engine: DbEngine): string {
  if (engine === "postgresql") return "PostgreSQL";
  if (engine === "mysql") return "MySQL";
  return "SQLite";
}

async function selectEditorContext(
  sqlEditor: SqlEditorPage,
  engine: DbEngine,
): Promise<void> {
  if (engine === "postgresql") {
    await sqlEditor.selectContext("default", "public");
  } else if (engine === "mysql") {
    await sqlEditor.selectContext("default");
  }
}

function actionsTableSql(engine: DbEngine, tableName: string): string {
  if (engine === "postgresql") {
    return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE
);
INSERT INTO ${tableName} (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');
    `.trim();
  }
  if (engine === "mysql") {
    return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE
);
INSERT INTO ${tableName} (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');
    `.trim();
  }
  return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE
);
INSERT INTO ${tableName} (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');
  `.trim();
}

function pageEditSeedSql(engine: DbEngine, tableName: string): string {
  const seriesInsert =
    engine === "postgresql"
      ? `INSERT INTO ${tableName} (label)
SELECT 'row-' || g FROM generate_series(1, 120) AS g;`
      : engine === "mysql"
        ? `INSERT INTO ${tableName} (label)
WITH RECURSIVE seq(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 120
)
SELECT CONCAT('row-', n) FROM seq;`
        : `INSERT INTO ${tableName} (label)
WITH RECURSIVE seq(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 120
)
SELECT 'row-' || n FROM seq;`;

  if (engine === "postgresql") {
    return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
  label VARCHAR(100) NOT NULL
);
${seriesInsert}
    `.trim();
  }
  if (engine === "mysql") {
    return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(100) NOT NULL
);
${seriesInsert}
    `.trim();
  }
  return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL
);
${seriesInsert}
  `.trim();
}

/** Portable 1..N series for pagination / non-updatable SELECT. */
function seriesSelectSql(count: number): string {
  return `
WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < ${count}
)
SELECT n FROM seq ORDER BY 1
  `.trim();
}

/**
 * Same query status-bar depth for every shipped engine.
 */
export function defineQueryStatusBarTests(engine: DbEngine): void {
  const label = labelOf(engine);
  const testPrefix = `qsb-${engine === "postgresql" ? "pg" : engine}`;

  test.describe(`Query status bar ${label}`, () => {
    test("Discard, add, remove, and refresh via status bar", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-actions-${suffix}`;
      const tableName = `e2e_qsb_actions_${suffix}`;
      const sqlitePath =
        engine === "sqlite"
          ? `/tmp/dbo-e2e-qsb-actions-${suffix}.db`
          : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Setup connection and table", async () => {
            await connectionPage.setupConnection(config);
            await sqlEditor.open();
            await selectEditorContext(sqlEditor, engine);
            await sqlEditor.typeAndRun(actionsTableSql(engine, tableName));
          });

          await test.step("Discard restores edited cell without save", async () => {
            await sqlEditor.typeAndRun(
              `SELECT * FROM ${tableName} ORDER BY id;`,
            );
            await dataGrid.waitForData("Alice");
            await dataGrid.expectEditActionsVisible(true);

            await dataGrid.editCell("Alice", "Alice Dirty");
            await dataGrid.expectCellVisible("Alice Dirty");
            await dataGrid.discardChanges();
            await dataGrid.expectCellVisible("Alice");
            await dataGrid.expectCellHidden("Alice Dirty");
          });

          await test.step("Add row via status bar and save", async () => {
            await dataGrid.addRow();
            await dataGrid.editLastRowEmptyCell(1, "Carol");
            await dataGrid.editLastRowEmptyCell(2, "carol@example.com");
            await dataGrid.saveChanges();

            await sqlEditor.typeAndRun(
              `SELECT * FROM ${tableName} WHERE email = 'carol@example.com';`,
            );
            await dataGrid.waitForData("Carol");
            await dataGrid.expectCellVisible("carol@example.com");
          });

          await test.step("Remove row via status bar and save", async () => {
            await sqlEditor.typeAndRun(
              `SELECT * FROM ${tableName} ORDER BY id;`,
            );
            await dataGrid.waitForData("Bob");
            await dataGrid.selectRowByCellText("Bob");
            await dataGrid.removeRow();
            await dataGrid.saveChanges();

            await sqlEditor.typeAndRun(
              `SELECT * FROM ${tableName} ORDER BY id;`,
            );
            await dataGrid.waitForData("Alice");
            await dataGrid.expectCellHidden("Bob");
            await dataGrid.expectCellVisible("Carol");
          });

          await test.step("Refresh discards dirty edit and re-runs query", async () => {
            await dataGrid.editCell("Alice", "Alice Temp");
            await dataGrid.expectCellVisible("Alice Temp");
            await dataGrid.refreshQuery();
            await dataGrid.waitForData("Alice");
            await dataGrid.expectCellHidden("Alice Temp");
          });

          await test.step("Cleanup table", async () => {
            await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
          });
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });

    test("Pagination next, hasMore gate, and page limit", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-page-${suffix}`;
      const sqlitePath =
        engine === "sqlite" ? `/tmp/dbo-e2e-qsb-page-${suffix}.db` : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Setup connection and open editor", async () => {
            await connectionPage.setupConnection(config);
            await sqlEditor.open();
            await selectEditorContext(sqlEditor, engine);
          });

          await test.step("Default page shows first page of 250", async () => {
            const responsePromise = pendingResponse(page, apiRoute.queryRaw);
            await sqlEditor.typeQuery(seriesSelectSql(250));
            await sqlEditor.clickRun();
            const response = await responsePromise;
            const body = (await response.json()) as {
              data: { data: unknown[]; paginated?: boolean };
            };

            expect(body.data.data.length).toBe(100);
            expect(body.data.paginated).toBe(true);
            await dataGrid.waitForData("1");
            await dataGrid.expectPreviousPageDisabled();
            await expect(dataGrid.nextPageButton).toBeEnabled();
          });

          await test.step("Next page shows 101+", async () => {
            await dataGrid.goToNextPage();
            await dataGrid.waitForData("101");
            await dataGrid.expectCellHidden("1");
            await dataGrid.expectCellVisible("102");
          });

          await test.step("Last page disables Next", async () => {
            await dataGrid.goToNextPage();
            await dataGrid.waitForData("201");
            await dataGrid.expectCellVisible("202");
            await dataGrid.expectNextPageDisabled();
          });

          await test.step("Change page limit to 5", async () => {
            await dataGrid.goToPreviousPage();
            await dataGrid.goToPreviousPage();
            await dataGrid.waitForData("1");
            await dataGrid.setPageLimit(5);
            await dataGrid.waitForData("1");
            await dataGrid.expectCellVisible("5");
            await dataGrid.expectCellHidden("6");
          });
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });

    test("Edit on page 2 and after changing limit", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-editpage-${suffix}`;
      const tableName = `e2e_qsb_page_${suffix}`;
      const sqlitePath =
        engine === "sqlite"
          ? `/tmp/dbo-e2e-qsb-editpage-${suffix}.db`
          : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Setup connection and seed 120 rows", async () => {
            await connectionPage.setupConnection(config);
            await sqlEditor.open();
            await selectEditorContext(sqlEditor, engine);
            await sqlEditor.typeAndRun(pageEditSeedSql(engine, tableName));
          });

          await test.step("Edit a cell on page 2 and save", async () => {
            await sqlEditor.typeAndRun(
              `SELECT * FROM ${tableName} ORDER BY id;`,
            );
            await dataGrid.waitForData("row-1");
            await dataGrid.goToNextPage();
            await dataGrid.waitForData("row-101");
            await dataGrid.editCell("row-101", "row-101-edited");
            await dataGrid.saveChanges();

            await sqlEditor.typeAndRun(
              `SELECT label FROM ${tableName} WHERE id = 101;`,
            );
            await dataGrid.waitForData("row-101-edited");
          });

          await test.step("Change limit then edit and save", async () => {
            await sqlEditor.typeAndRun(
              `SELECT * FROM ${tableName} ORDER BY id;`,
            );
            await dataGrid.waitForData("row-1");
            await dataGrid.setPageLimit(10);
            await dataGrid.waitForData("row-1");
            await dataGrid.expectCellVisible("row-10");
            await dataGrid.expectCellHidden("row-11");
            await dataGrid.editCell("row-2", "row-2-edited");
            await dataGrid.saveChanges();

            await sqlEditor.typeAndRun(
              `SELECT label FROM ${tableName} WHERE id = 2;`,
            );
            await dataGrid.waitForData("row-2-edited");
          });

          await test.step("Cleanup table", async () => {
            await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
          });
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });

    test("Edit actions gated for non-updatable results", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-gate-${suffix}`;
      const tableName = `e2e_qsb_gate_${suffix}`;
      const sqlitePath =
        engine === "sqlite" ? `/tmp/dbo-e2e-qsb-gate-${suffix}.db` : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      const gateTableSql =
        engine === "postgresql"
          ? `DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, name TEXT);
INSERT INTO ${tableName} (name) VALUES ('gated');`
          : engine === "mysql"
            ? `DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (id INT AUTO_INCREMENT PRIMARY KEY, name TEXT);
INSERT INTO ${tableName} (name) VALUES ('gated');`
            : `DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
INSERT INTO ${tableName} (name) VALUES ('gated');`;

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Setup connection and table", async () => {
            await connectionPage.setupConnection(config);
            await sqlEditor.open();
            await selectEditorContext(sqlEditor, engine);
            await sqlEditor.typeAndRun(gateTableSql.trim());
          });

          await test.step("Expression-only SELECT hides edit actions", async () => {
            await sqlEditor.typeAndRun(seriesSelectSql(3));
            await dataGrid.waitForData("1");
            await dataGrid.expectEditActionsVisible(false);
            await dataGrid.expectCellNotEditable("2");
          });

          await test.step("Simple table SELECT shows edit actions", async () => {
            await sqlEditor.typeAndRun(`SELECT * FROM ${tableName};`);
            await dataGrid.waitForData("gated");
            await dataGrid.expectEditActionsVisible(true);
          });

          await test.step("Cleanup table", async () => {
            await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
          });
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });
  });
}

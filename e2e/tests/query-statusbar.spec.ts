import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../pages";

/**
 * Query result-grid status bar — actions, pagination, and edit gating (PostgreSQL).
 */
test.describe("Query status bar", () => {
  const testPrefix = "qsb";

  test("Discard, add, remove, and refresh via status bar", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const dataGrid = new DataGridPage(page);

    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `${testPrefix}-actions-${suffix}`;
    const tableName = `e2e_qsb_actions_${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and table", async () => {
        await connectionPage.setupConnection(config);
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
        await sqlEditor.typeAndRun(
          `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE
);
INSERT INTO ${tableName} (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');
          `.trim(),
        );
      });

      await test.step("Discard restores edited cell without save", async () => {
        await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
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
        // Columns: name (0), email (1) — id is serial; order may be id, name, email
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
        await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
        await dataGrid.waitForData("Bob");
        await dataGrid.selectRowByCellText("Bob");
        await dataGrid.removeRow();
        await dataGrid.saveChanges();

        await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
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
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and open editor", async () => {
        await connectionPage.setupConnection(config);
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
      });

      await test.step("Default page shows first page of 250", async () => {
        const responsePromise = page.waitForResponse(
          (response) =>
            response.url().includes("/query/raw") &&
            response.request().method() === "POST" &&
            response.status() === 200,
          { timeout: 15000 },
        );
        await sqlEditor.typeQuery(
          "SELECT generate_series(1, 250) AS n ORDER BY 1",
        );
        await sqlEditor.clickRun();
        const response = await responsePromise;
        const body = (await response.json()) as {
          data: { data: unknown[]; paginated?: boolean };
        };

        // Grid is virtualized — assert API page size, not off-screen cell "100".
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
        // Only assert near-top cells — the grid is virtualized.
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
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and seed 120 rows", async () => {
        await connectionPage.setupConnection(config);
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
        await sqlEditor.typeAndRun(
          `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
  label VARCHAR(100) NOT NULL
);
INSERT INTO ${tableName} (label)
SELECT 'row-' || g FROM generate_series(1, 120) AS g;
          `.trim(),
        );
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
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and table", async () => {
        await connectionPage.setupConnection(config);
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
        await sqlEditor.typeAndRun(
          `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, name TEXT);
INSERT INTO ${tableName} (name) VALUES ('gated');
          `.trim(),
        );
      });

      await test.step("Expression-only SELECT hides edit actions", async () => {
        await sqlEditor.typeAndRun(
          "SELECT generate_series(1, 3) AS n ORDER BY 1",
        );
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
    });
  });
});

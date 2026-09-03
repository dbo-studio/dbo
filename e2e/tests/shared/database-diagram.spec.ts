import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import {
  ConnectionPage,
  DiagramPage,
  ObjectTreePage,
  SqlEditorPage,
} from "../../pages";

test.describe("Database diagram", () => {
  test("PostgreSQL shows FK edges, related highlight, and PNG export", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `diagram-pg-${suffix}`;
    const usersTable = `e2e_diag_users_${suffix}`;
    const postsTable = `e2e_diag_posts_${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const tree = new ObjectTreePage(page);
      const diagram = new DiagramPage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create PostgreSQL connection", async () => {
        await connectionPage.setupConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Seed users and posts with FK", async () => {
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
        await sqlEditor.typeAndRun(
          `
CREATE TABLE ${usersTable} (
  id integer PRIMARY KEY,
  email text NOT NULL
);
CREATE TABLE ${postsTable} (
  id integer PRIMARY KEY,
  user_id integer NOT NULL REFERENCES ${usersTable}(id)
);
          `.trim(),
        );
      });

      try {
        await test.step("Open diagram from posts table", async () => {
          await tree.expandPath([connectionName, "default", "public"]);
          await tree.refreshExpandNode("Tables");
          await expect(tree.getTreeNode(postsTable)).toBeVisible({
            timeout: 15000,
          });
          await diagram.openFromTree(postsTable);
        });

        await test.step("Tables, types, and PK/FK are visible", async () => {
          await diagram.expectTableVisible(usersTable);
          await diagram.expectTableVisible(postsTable);
          await expect(diagram.getColumn(usersTable, "id")).toContainText("PK");
          await expect(diagram.getColumn(postsTable, "user_id")).toContainText(
            "FK",
          );
        });

        await test.step("Selecting a table highlights related nodes", async () => {
          await diagram.selectTable(usersTable);
          await expect(diagram.getNode(postsTable)).toHaveAttribute(
            "data-highlighted",
            "true",
          );
        });

        await test.step("Export PNG", async () => {
          const downloadPromise = page.waitForEvent("download");
          await diagram.exportPng();
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.png$/);
        });

        await test.step("Source tab shows DBML for the diagram", async () => {
          await diagram.openSourcePanel();
          await expect(diagram.sourceDbml).toContainText(
            `Table public.${usersTable}`,
          );
          await expect(diagram.sourceDbml).toContainText(
            `Table public.${postsTable}`,
          );
          await expect(diagram.sourceDbml).toContainText(
            `Ref: public.${postsTable}.user_id > public.${usersTable}.id`,
          );
        });
      } finally {
        await sqlEditor.open();
        await sqlEditor.typeAndRun(
          `DROP TABLE IF EXISTS ${postsTable}; DROP TABLE IF EXISTS ${usersTable};`,
        );
      }
    });
  });

  test("MySQL shows tables and FK from child table", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `diagram-mysql-${suffix}`;
    const usersTable = `e2e_diag_users_${suffix}`;
    const postsTable = `e2e_diag_posts_${suffix}`;
    const config = getDbConfig("mysql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const tree = new ObjectTreePage(page);
      const diagram = new DiagramPage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create MySQL connection", async () => {
        await connectionPage.setupConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Seed users and posts with FK", async () => {
        await sqlEditor.open();
        await sqlEditor.selectContext("default");
        await sqlEditor.typeAndRun(
          `
CREATE TABLE ${usersTable} (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL
);
CREATE TABLE ${postsTable} (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  CONSTRAINT fk_${suffix} FOREIGN KEY (user_id) REFERENCES ${usersTable}(id)
);
          `.trim(),
        );
      });

      try {
        await test.step("Open diagram from posts table", async () => {
          await tree.expandPath([connectionName, "default"]);
          await tree.refreshExpandNode("Tables");
          await expect(tree.getTreeNode(postsTable)).toBeVisible({
            timeout: 15000,
          });
          await diagram.openFromTree(postsTable);
        });

        await test.step("FK relationship is on the canvas", async () => {
          await diagram.expectTableVisible(usersTable);
          await diagram.expectTableVisible(postsTable);
          await expect(diagram.getColumn(postsTable, "user_id")).toContainText(
            "FK",
          );
        });
      } finally {
        await sqlEditor.open();
        await sqlEditor.typeAndRun(
          `DROP TABLE IF EXISTS ${postsTable}; DROP TABLE IF EXISTS ${usersTable};`,
        );
      }
    });
  });

  test("SQLite shows tables and FK from Tables container", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `diagram-sqlite-${suffix}`;
    const usersTable = `e2e_diag_users_${suffix}`;
    const postsTable = `e2e_diag_posts_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-diagram-${suffix}.db`;
    const config = getDbConfig("sqlite", connectionName, dbPath);

    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const tree = new ObjectTreePage(page);
      const diagram = new DiagramPage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create SQLite connection", async () => {
        await connectionPage.setupConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Seed users and posts with FK", async () => {
        await sqlEditor.open();
        await sqlEditor.typeAndRun(
          `
PRAGMA foreign_keys = ON;
CREATE TABLE ${usersTable} (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL
);
CREATE TABLE ${postsTable} (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES ${usersTable}(id)
);
          `.trim(),
        );
      });

      try {
        await test.step("Open diagram from Tables", async () => {
          await tree.expandPath([connectionName]);
          await tree.refreshExpandNode("Tables");
          await diagram.openFromTree("Tables");
        });

        await test.step("Both tables and FK column are visible", async () => {
          await diagram.expectTableVisible(usersTable);
          await diagram.expectTableVisible(postsTable);
          await expect(diagram.getColumn(usersTable, "id")).toContainText("PK");
          await expect(diagram.getColumn(postsTable, "user_id")).toContainText(
            "FK",
          );
        });
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });
});

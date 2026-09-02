import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  createStrictWithoutRowidTable,
  removeSqliteDbFile,
  setupSqliteConnection,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ObjectTreePage } from "../../pages";

test.describe("Object Form SQLite STRICT / WITHOUT ROWID", () => {
  test("Create STRICT + WITHOUT ROWID table with primary key", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `e2e-sqlite-strict-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-strict-${suffix}.db`;
    const tableName = `strict_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        await test.step("Connect", async () => {
          await setupSqliteConnection(page, connectionName, dbPath);
        });

        await test.step("Create STRICT WITHOUT ROWID table", async () => {
          await createStrictWithoutRowidTable(page, connectionName, tableName);
        });

        await test.step("Cleanup table", async () => {
          const tree = new ObjectTreePage(page);
          await tree.expandPath([connectionName]);
          await tree.dropObject(tableName, "Drop table");
        });
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });
});

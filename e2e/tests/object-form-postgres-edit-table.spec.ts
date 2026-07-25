import { test } from "@playwright/test";
import { postgresLifecycleNames } from "../fixtures/postgresObjectFormLifecycle";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  createDatabase,
  createPostsTable,
  createUsersTable,
  editUsersTableAddColumn,
  setupPostgresConnection,
} from "../helpers/objectFormPostgresLifecycle";
import {
  editTableAddUniqueKey,
  editTableChangeColumnType,
  editTableComment,
  editTableDropColumn,
  editTableDropForeignKey,
  editTableDropKey,
  editTableRename,
  editTableSetColumnComment,
  editTableSetDefault,
  editTableSetNotNull,
} from "../helpers/objectFormPostgresExtended";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, ObjectTreePage } from "../pages";

test.describe("Object Form PostgreSQL edit table", () => {
  test("Column and foreign key edits", async ({ page }, testInfo) => {
    const names = postgresLifecycleNames(uniqueTestSuffix(testInfo));
    const renamedUsersTable = `${names.usersTable}_renamed`;

    const dropCreated = async () => {
      const tree = new ObjectTreePage(page);
      const connectionPage = new ConnectionPage(page);
      try {
        await tree.expandPath([
          names.connectionName,
          names.databaseName,
          "public",
        ]);
        await tree
          .dropObject(names.postsTable, "Drop table")
          .catch(() => undefined);
        await tree
          .dropObject(renamedUsersTable, "Drop table")
          .catch(() => undefined);
        await tree
          .dropObject(names.usersTable, "Drop table")
          .catch(() => undefined);
        await tree.expandNode(names.connectionName);
        await tree
          .dropObject(names.databaseName, "Drop database")
          .catch(() => undefined);
        if (await connectionPage.connectionExists(names.connectionName)) {
          await connectionPage.deleteConnection(names.connectionName);
        }
      } catch (cleanupErr) {
        console.warn(
          "[e2e] postgres edit-table cleanup after failure:",
          cleanupErr,
        );
      }
    };

    await withConnectionCleanup(page, names.connectionName, async () => {
      try {
        await test.step("Connect and create base tables", async () => {
          await setupPostgresConnection(page, names.connectionName);
          await createDatabase(page, names.connectionName, names.databaseName);
          await createUsersTable(
            page,
            names.connectionName,
            names.databaseName,
            names.usersTable,
          );
          await createPostsTable(
            page,
            names.connectionName,
            names.databaseName,
            names.postsTable,
            names.usersTable,
          );
          await editUsersTableAddColumn(page, names.usersTable);
        });

        await test.step("Set NOT NULL on email column", async () => {
          await editTableSetNotNull(page, names.usersTable, 1);
        });

        await test.step("Set default on email column", async () => {
          await editTableSetDefault(page, names.usersTable, 1, "'unknown'");
        });

        await test.step("Set comment on email column", async () => {
          await editTableSetColumnComment(
            page,
            names.usersTable,
            1,
            "user email address",
          );
        });

        await test.step("Drop foreign key on posts table", async () => {
          await editTableDropForeignKey(page, names.postsTable);
        });

        await test.step("Drop notes column on users table", async () => {
          await editTableDropColumn(page, names.usersTable, 2);
        });

        await test.step("Rename users table", async () => {
          await editTableRename(page, names.usersTable, renamedUsersTable);
        });

        await test.step("Set comment on users table", async () => {
          await editTableComment(page, renamedUsersTable, "application users");
        });

        await test.step("Change email column type", async () => {
          await editTableChangeColumnType(
            page,
            renamedUsersTable,
            1,
            "character varying",
          );
        });

        await test.step("Add UNIQUE key on email column", async () => {
          await editTableAddUniqueKey(
            page,
            renamedUsersTable,
            "uniq_users_email",
            ["email"],
          );
        });

        await test.step("Drop UNIQUE key on email column", async () => {
          await editTableDropKey(page, renamedUsersTable, 1);
        });

        await test.step("Cleanup — drop tables, database, and connection", async () => {
          await dropCreated();
        });
      } catch (err) {
        await dropCreated();
        throw err;
      }
    });
  });
});

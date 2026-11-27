// @tool: Object form
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { ObjectFormPage, ObjectTreePage } from "../../pages";
import { useMongo } from "./_case";

const mongoContainer = process.env.MONGO_TEST_CONTAINER ?? "dbo-studio-sample-mongo";

/** MongoDB databases and collections are created and dropped from the tree through the same object form SQL drivers use. */
test.describe("MongoDB object forms", () => {
  const m = useMongo("of");
  const dbName = (): string => `dbo_of_${m.s.coll.replace(/[^a-z0-9_]/g, "_").slice(-24)}`;

  test.afterEach(() => {
    try {
      execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", dbName(), "--eval", "db.dropDatabase()"], { stdio: "ignore" });
    } catch {
      /* docker is optional for cleanup */
    }
  });

  test("creates a database, adds a capped collection to it and drops the database from the tree", async ({ page }) => {
    const tree = new ObjectTreePage(page);
    const form = new ObjectFormPage(page);
    const name = dbName();
    await page.goto("/");
    await tree.waitForTreeLoad();

    await test.step("Create database previews the shell statement and adds the node", async () => {
      await tree.runTreeAction(m.s.name, "Create database");
      await form.waitForReady();
      await form.fillGeneralField("name", name);
      await form.fillGeneralField("collection", "base");
      await form.save();
      await form.assertPreviewContains(`db.createCollection("base")`);
      await form.confirmExecute();
      await tree.refreshExpandNode(m.s.name);
      await tree.expectNodeVisible(name);
    });

    await test.step("Create collection on the database makes a capped collection", async () => {
      await form.closeAllWorkspaceTabs();
      await tree.runTreeAction(name, "Create collection");
      await form.waitForReady();
      await form.fillGeneralField("name", "ring");
      await form.selectGeneralOption("kind", "Capped");
      await form.fillGeneralField("cappedBytes", "8192");
      await form.save();
      await form.assertPreviewContains("capped: true, size: 8192");
      await form.confirmExecute();
      await tree.refreshExpandNode(name);
      await tree.expectNodeVisible("ring");
    });

    await test.step("Drop database removes the node", async () => {
      await form.closeAllWorkspaceTabs();
      await tree.runTreeAction(name, "Drop database");
      await page.getByRole("button", { name: /^(drop|confirm|delete|yes)/i }).last().click();
      await expect(page.getByTestId(`tree-node-${name}`)).toBeHidden({ timeout: 15000 });
    });
  });

  test("creates a user from the Users node, then drops it", async ({ page }) => {
    const tree = new ObjectTreePage(page);
    const form = new ObjectFormPage(page);
    const user = `dbo_u_${m.s.coll.replace(/[^a-z0-9]/g, "").slice(-12)}`;
    await page.goto("/");
    await tree.waitForTreeLoad();

    try {
      await test.step("Create user hides the password in the preview", async () => {
        await tree.runTreeAction("Users", "Create user");
        await form.waitForReady();
        await form.fillGeneralField("name", user);
        await form.fillGeneralField("password", "s3cret-pass");
        await form.fillGeneralField("roles", "read@test");
        await form.save();
        await form.assertPreviewContains("db.createUser");
        await expect(page.getByText("s3cret-pass")).toHaveCount(0);
        await form.confirmExecute();
      });

      await test.step("The user appears under Users", async () => {
        await form.closeAllWorkspaceTabs();
        await tree.refreshExpandNode("Users");
        await tree.expectNodeVisible(`${user}@admin`);
      });

      await test.step("Drop user removes it", async () => {
        await tree.runTreeAction(`${user}@admin`, "Drop user");
        await page.getByRole("button", { name: /^(drop|confirm|delete|yes)/i }).last().click();
        await expect(tree.getTreeNode(`${user}@admin`)).toBeHidden({ timeout: 15000 });
      });
    } finally {
      try {
        execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", "admin", "--eval", `db.dropUser(${JSON.stringify(user)})`], { stdio: "ignore" });
      } catch {
        /* the user is already gone, or docker is missing */
      }
    }
  });
});

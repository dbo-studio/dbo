import { applyBrowseFilter } from "../../helpers/browseFilter";
import { expect, test, type Page } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ConnectionPage } from "../../pages";

/**
 * NoSQL engine (Browse tab, tools) against the in-memory fixture driver.
 * The connection is created through the API because the fixture type is not in the connection picker.
 */
const apiUrl = (): string => process.env.PLAYWRIGHT_API_URL ?? "";

async function openFixtureConnection(
  page: Page,
  name: string,
): Promise<number> {
  const create = await page.request.post(`${apiUrl()}/connections`, {
    data: { name, type: "nosql_fixture", options: {} },
    headers: { "X-Client-Mode": "web" },
  });
  expect(create.ok()).toBeTruthy();

  const connectionPage = new ConnectionPage(page);
  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.openSwitcher();
  await connectionPage.getConnectionItem(name).click();
  await expect(page.getByRole("treeitem").first()).toBeVisible({
    timeout: 30000,
  });

  const list = await page.request.get(`${apiUrl()}/connections`, {
    headers: { "X-Client-Mode": "web" },
  });
  const body = (await list.json()) as {
    data: { id: number; name: string }[];
  };
  return body.data.find((c) => c.name === name)!.id;
}

async function openContainer(page: Page, container: string): Promise<void> {
  const node = page.getByTestId(`tree-node-${container}`);
  if (!(await node.isVisible().catch(() => false))) {
    await page.getByTestId("tree-node-fixture").click();
  }
  // Tree actions (open a tab) run on double-click.
  await node.dblclick();
  await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });
}

test.describe("NoSQL engine (fixture driver)", () => {
  let name: string;
  let connectionId: number;

  test.beforeEach(async ({ page }, testInfo) => {
    name = `nosql-${uniqueTestSuffix(testInfo)}`;
    connectionId = await openFixtureConnection(page, name);
  });

  test("pattern containers: tree list, cursor paging, filter, edit and delete", async ({
    page,
  }) => {
    await openContainer(page, "keys");
    const items = page.getByTestId("browse-item");

    await test.step("first page is bounded and 'load more' fetches the next cursor page", async () => {
      await expect(page.getByTestId("browse-footer")).toContainText(
        "100 loaded",
      );
      await page.getByRole("button", { name: "Load more" }).click();
      await expect(page.getByTestId("browse-footer")).toContainText(
        "200 loaded",
      );
    });

    await test.step("pattern filter narrows the list; delimiter builds a folder tree", async () => {
      await applyBrowseFilter(page, "user:*");
      await expect(page.getByTestId("browse-footer")).toContainText(
        "2 loaded",
      );
      await expect(page.getByTestId("browse-folder").first()).toBeVisible();
      await page.getByTestId("browse-folder").first().click(); // user
      await page.getByTestId("browse-folder").nth(1).click(); // user:1
      await expect(items.first()).toHaveAttribute(
        "data-item-id",
        "user:1:name",
      );
    });

    await test.step("selecting an item renders it with capability actions only", async () => {
      await items.first().click();
      await expect(page.getByTestId("browse-item-view")).toContainText(
        "user:1:name",
      );
      await expect(page.getByLabel("rename-key")).toBeVisible();
      await expect(page.getByLabel("edit-ttl")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Delete item" }),
      ).toBeVisible();
    });

    await test.step("delete asks for confirmation and removes the item", async () => {
      await page.getByRole("button", { name: "Delete item" }).click();
      await page.getByRole("button", { name: /confirm|delete|yes/i }).last().click();
      await expect(page.getByTestId("browse-footer")).toContainText(
        "1 loaded",
      );
    });
  });

  test("only declared capabilities are offered; undeclared writes are rejected by the API", async ({
    page,
  }) => {
    await openContainer(page, "sets");
    await page.getByTestId("browse-item").first().click();

    await expect(page.getByTestId("new-key-button")).toHaveCount(0);
    await expect(page.getByLabel("rename-key")).toHaveCount(0);
    await expect(page.getByLabel("edit-ttl")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete item" })).toHaveCount(
      0,
    );

    const res = await page.request.post(`${apiUrl()}/nosql/items/delete`, {
      data: { connectionId, containerId: "sets", itemIds: ["item:1"] },
      headers: { "X-Client-Mode": "web" },
    });
    expect(res.status()).toBe(400);
  });

  test("fields filter reuses Filters and shows the generated query", async ({
    page,
  }) => {
    await openContainer(page, "documents");
    await expect(page.getByTestId("browse-footer")).toContainText("2 loaded");

    const filters = page.getByTestId("browse-fields-filter");
    await filters.locator(".add-filter-btn").first().click();
    await filters.locator("[data-testid=filter-value] input").fill("64b7f0000000000000000001");
    await filters.locator("[data-testid=filter-value] input").press("Enter");

    await expect(page.getByTestId("browse-footer")).toContainText("1 loaded");
    await expect(page.getByTestId("browse-generated-query")).toContainText(
      "_id = \"64b7f0000000000000000001\"",
    );
  });

  test("query containers run the raw query", async ({ page }) => {
    await openContainer(page, "query");
    await applyBrowseFilter(page, "bob");
    await expect(page.getByTestId("browse-footer")).toContainText("1 loaded");
  });

  test("every view kind renders", async ({ page }) => {
    await openContainer(page, "hashes");
    await page.getByTestId("browse-item").first().click();
    await expect(page.getByTestId("browse-item-view")).toContainText("Field");

    await openContainer(page, "lists");
    await page.getByTestId("browse-item").first().click();
    await expect(page.getByTestId("browse-item-view")).toContainText("Member");

    await openContainer(page, "tables");
    await page.getByTestId("browse-item").first().click();
    await expect(page.getByRole("columnheader", { name: "id" })).toBeVisible();

    await openContainer(page, "documents");
    await page.getByTestId("browse-item").first().click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 20000,
    });
  });

  test("binary values arrive base64 and bulk delete needs confirmation", async ({
    page,
  }) => {
    const get = await page.request.get(`${apiUrl()}/nosql/item`, {
      params: { connectionId, containerId: "keys", itemId: "bin:blob" },
      headers: { "X-Client-Mode": "web" },
    });
    const item = (await get.json()).data;
    expect(item.meta.encoding).toBe("base64");
    expect(Buffer.from(item.value, "base64")).toEqual(
      Buffer.from([0xff, 0x00, 0xfe]),
    );

    const unconfirmed = await page.request.post(
      `${apiUrl()}/nosql/items/delete`,
      {
        data: {
          connectionId,
          containerId: "keys",
          itemIds: ["user:1:name", "user:2:name"],
        },
        headers: { "X-Client-Mode": "web" },
      },
    );
    expect(unconfirmed.status()).toBe(403);
    expect((await unconfirmed.json()).message).toBe(
      "safe_mode_confirm_required",
    );
  });

  test("Extended JSON documents round-trip through save", async ({ page }) => {
    const id = "64b7f0000000000000000001";
    const before = (
      await (
        await page.request.get(`${apiUrl()}/nosql/item`, {
          params: { connectionId, containerId: "documents", itemId: id },
          headers: { "X-Client-Mode": "web" },
        })
      ).json()
    ).data.value as string;

    const save = await page.request.put(`${apiUrl()}/nosql/item`, {
      data: {
        connectionId,
        containerId: "documents",
        itemId: id,
        change: { value: before },
      },
      headers: { "X-Client-Mode": "web" },
    });
    expect(save.ok()).toBeTruthy();

    const after = (
      await (
        await page.request.get(`${apiUrl()}/nosql/item`, {
          params: { connectionId, containerId: "documents", itemId: id },
          headers: { "X-Client-Mode": "web" },
        })
      ).json()
    ).data.value as string;
    expect(after).toBe(before);
    expect(after).toContain("$oid");
    expect(after).toContain("$numberInt");
    expect(after).toContain("$date");
  });

  test("SQL-only features are hidden for NoSQL connections", async ({
    page,
  }) => {
    await expect(page.getByRole("button", { name: "sql", exact: true })).toBeDisabled();
    await openContainer(page, "keys");
    await expect(page.getByTestId("ai-empty-quick-setup")).toHaveCount(0);
  });

  test("pub/sub tool streams over SSE and closing it cancels the backend subscription", async ({
    page,
  }) => {
    await openContainer(page, "keys");
    await page.getByLabel("More actions").click();
    await page.getByRole("menuitem", { name: "Pub/Sub" }).click();
    await page.getByLabel("pubsub-channels").fill("fixture");
    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByTestId("pubsub-messages")).toContainText("tick", {
      timeout: 15000,
    });

    await test.step("aborted streams release their slot (cap is 5 per user)", async () => {
      const results = await page.evaluate(async (id) => {
        const out: string[] = [];
        for (let i = 0; i < 7; i++) {
          const ctl = new AbortController();
          const res = await fetch(
            `/api/nosql/tools/pubsub/stream?connectionId=${id}&channel=fixture`,
            {
              credentials: "include",
              headers: { "X-Client-Mode": "web" },
              signal: ctl.signal,
            },
          );
          const reader = res.body!.getReader();
          const { value } = await reader.read();
          out.push(new TextDecoder().decode(value).includes('"error"') ? "error" : "ok");
          ctl.abort();
          await new Promise((r) => setTimeout(r, 400));
        }
        return out;
      }, connectionId);
      expect(results).toEqual(Array(7).fill("ok"));
    });
  });
});

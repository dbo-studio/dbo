import { expect, test, type Page } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ConnectionPage } from "../../pages";

/**
 * Redis driver on the NoSQL engine. Needs a Redis (docker compose -f docker-compose.dev.yml up -d sample-redis).
 * The connection is created through the real New connection form.
 */
const apiUrl = (): string => process.env.PLAYWRIGHT_API_URL ?? "";
const redisHost = process.env.REDIS_TEST_HOST ?? "127.0.0.1";
const redisPort = process.env.REDIS_TEST_PORT ?? "46379";
const headers = { "X-Client-Mode": "web" };

async function createRedisConnection(page: Page, name: string): Promise<number> {
  const connectionPage = new ConnectionPage(page);
  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.openNewConnectionModal();
  await connectionPage.selectConnectionType("Redis");
  await connectionPage.nameInput.fill(name);
  await connectionPage.hostInput.fill(redisHost);
  await page.locator('input[name="port"]').fill(redisPort);
  await connectionPage.testConnection();
  await connectionPage.submitConnection();
  await connectionPage.openSwitcher();
  await connectionPage.getConnectionItem(name).click();
  await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });

  const list = await page.request.get(`${apiUrl()}/connections`, { headers });
  const body = (await list.json()) as { data: { id: number; name: string }[] };
  return body.data.find((c) => c.name === name)!.id;
}

async function insert(
  page: Page,
  connectionId: number,
  id: string,
  kind: string,
  view: string,
  value: unknown,
): Promise<void> {
  const res = await page.request.post(`${apiUrl()}/nosql/item`, {
    data: { connectionId, containerId: "db0", item: { id, view, value, meta: { kind } } },
    headers,
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

async function openDb0(page: Page, connectionName: string): Promise<void> {
  const node = page.getByTestId("tree-node-db0");
  if (!(await node.isVisible().catch(() => false))) {
    // The root node (named after the connection) is collapsed until clicked.
    await page.getByTestId(`tree-node-${connectionName.toLowerCase()}`).click();
  }
  await expect(node).toBeVisible({ timeout: 15000 });
  await node.dblclick();
  await expect(page.getByTestId("browse-tab")).toBeVisible({ timeout: 15000 });
}

test.describe("Redis driver", () => {
  let name: string;
  let connectionId: number;
  let prefix: string;

  test.beforeEach(async ({ page }, testInfo) => {
    name = `redis-${uniqueTestSuffix(testInfo)}`;
    prefix = `e2e:${uniqueTestSuffix(testInfo)}`;
    connectionId = await createRedisConnection(page, name);
  });

  test.afterEach(async ({ page }) => {
    // Remove only this test's keys; the shared Redis is never flushed.
    const run = await page.request.get(`${apiUrl()}/nosql/browse`, {
      params: { connectionId, containerId: "db0", filter: `${prefix}*`, limit: 500 },
      headers,
    });
    const keys = ((await run.json()).data?.items ?? []).map((i: { id: string }) => i.id);
    if (keys.length) {
      await page.request.post(`${apiUrl()}/nosql/items/delete`, {
        data: { connectionId, containerId: "db0", itemIds: keys, confirmed: true },
        headers,
      });
    }
  });

  test("tree lists databases; key tree, pattern, editors, TTL and rename work", async ({ page }) => {
    await insert(page, connectionId, `${prefix}:user:1`, "string", "text", "alice");
    await insert(page, connectionId, `${prefix}:session`, "hash", "fields", { uid: "1", ip: "1.2.3.4" });
    await insert(page, connectionId, `${prefix}:queue`, "list", "list", ["a", "b"]);
    await insert(page, connectionId, `${prefix}:tags`, "set", "set", ["x", "y"]);
    await insert(page, connectionId, `${prefix}:board`, "zset", "set", [
      { member: "m1", score: 1 },
      { member: "m2", score: 2 },
    ]);

    await openDb0(page, name);

    await test.step("pattern filter uses SCAN and the delimiter builds a key tree", async () => {
      await page.getByLabel("browse-pattern").fill(`${prefix}:*`);
      await page.getByLabel("browse-pattern").press("Enter");
      await expect(page.getByTestId("browse-footer")).toContainText("5 loaded");
      await expect(page.getByTestId("browse-folder").first()).toBeVisible();
    });

    const open = async (key: string): Promise<void> => {
      await page.getByLabel("browse-pattern").fill(key);
      await page.getByLabel("browse-pattern").press("Enter");
      await expect(page.getByTestId("browse-footer")).toContainText("1 loaded");
      // Expand collapsed folders (marked ▸) until the key row is reachable.
      const collapsed = page.getByTestId("browse-folder").filter({ hasText: "▸" });
      for (let i = 0; i < 8 && (await collapsed.count()) > 0; i++) {
        await collapsed.first().click();
      }
      await page.getByTestId("browse-item").first().click();
    };

    await test.step("hash grid: changes are staged and highlighted until the check button applies them", async () => {
      await open(`${prefix}:session`);
      const view = page.getByTestId("browse-item-view");
      const bar = page.getByTestId("status-rows"); // the app status bar line: "N rows · 1 pending"
      const raw = (): Promise<{ data: { members: { key: string; value: string }[] } }> =>
        page.request
          .get(`${apiUrl()}/nosql/item/window`, { params: { connectionId, containerId: "db0", itemId: `${prefix}:session` }, headers })
          .then((r) => r.json());
      await expect(view).toContainText("Field");
      await expect(bar).toContainText("2 rows");

      // Like the SQL grid: a click only highlights the row, a double click edits the cell.
      await view.getByText("1.2.3.4", { exact: true }).click();
      await expect(page.getByLabel("member-value")).toHaveCount(0);
      await expect(page.getByTestId("member-row").filter({ hasText: "1.2.3.4" }).getByRole("checkbox")).toBeChecked();
      await view.getByText("1.2.3.4", { exact: true }).dblclick();
      await page.getByLabel("member-value").fill("9.9.9.9");
      await page.getByLabel("member-value").press("Enter");
      await expect(view.getByText("9.9.9.9", { exact: true })).toBeVisible();
      await expect(bar).toContainText("1 pending");
      expect((await raw()).data.members.find((m) => m.key === "ip")?.value).toBe("1.2.3.4"); // nothing written yet

      await test.step("context menu and quick look editor stage an edit", async () => {
        await view.getByText("9.9.9.9", { exact: true }).click({ button: "right" });
        await page.getByRole("menuitem", { name: /quick look/i }).click();
        await expect(page.getByTestId("value-panel-body-text")).toBeVisible();
        await page.getByTestId("value-panel-body-text").locator(".monaco-editor").first().click();
        await page.keyboard.press("End");
        await page.keyboard.insertText("-edited");
        await page.getByTestId("value-panel-apply").click();
        await expect(view.getByText("9.9.9.9-edited", { exact: true })).toBeVisible();
      });

      await page.getByRole("button", { name: "Add row" }).click();
      await page.getByLabel("member-key").fill("region");
      await page.getByLabel("member-value").fill("eu");
      await expect(bar).toContainText("2 pending");

      await page.getByTestId("member-row").filter({ hasText: "uid" }).click();
      await page.getByRole("button", { name: "Remove row" }).click();
      await expect(page.locator("tr.removed-highlight")).toHaveCount(1);
      await expect(bar).toContainText("3 pending");

      await page.getByTestId("member-save").click();
      await page.getByRole("button", { name: "Delete", exact: true }).click(); // removals ask first
      await expect(bar).toContainText("2 rows");
      await expect(bar).not.toContainText("pending");
      const keys = Object.fromEntries((await raw()).data.members.map((m) => [m.key, m.value]));
      expect(keys).toEqual({ ip: "9.9.9.9-edited", region: "eu" });
    });

    await test.step("discard drops staged changes", async () => {
      const view = page.getByTestId("browse-item-view");
      await view.getByText("eu", { exact: true }).dblclick();
      await page.getByLabel("member-value").fill("us");
      await page.getByLabel("member-value").press("Enter");
      await expect(page.getByTestId("status-rows")).toContainText("1 pending");
      await page.getByRole("button", { name: "Discard changes" }).click();
      await expect(view.getByText("eu", { exact: true })).toBeVisible();
      await expect(page.getByTestId("status-rows")).not.toContainText("pending");
    });

    await test.step("TTL set shows in the footer; rename moves the key", async () => {
      await page.getByLabel("edit-ttl").click();
      await page.getByLabel("ttl-input").fill("3600");
      await page.getByRole("button", { name: "Set", exact: true }).click();
      await expect(page.getByTestId("item-ttl")).toContainText(/Expires in (1h|59m)/);

      await page.getByLabel("rename-key").click();
      await page.getByLabel("rename-input").fill(`${prefix}:session2`);
      await page.getByRole("button", { name: "Rename", exact: true }).click();
      await expect(page.getByTestId("browse-item-view")).toContainText(`${prefix}:session2`);
    });

    await test.step("sorted set shows scores", async () => {
      await open(`${prefix}:board`);
      await expect(page.getByTestId("browse-item-view")).toContainText("Score");
    });

    await test.step("string can be created with the type picker and deleted", async () => {
      await page.getByTestId("new-key-button").click();
      await page.getByLabel("new-item-id").fill(`${prefix}:created`);
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await expect(page.getByTestId("browse-item-view")).toContainText(`${prefix}:created`);
      await page.getByRole("button", { name: "Delete item" }).click();
      // The confirm modal's button is exactly "Delete"; the header has the "Delete item" icon button.
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect
        .poll(async () =>
          (
            await page.request.get(`${apiUrl()}/nosql/item`, {
              params: { connectionId, containerId: "db0", itemId: `${prefix}:created` },
              headers,
            })
          ).ok(),
        )
        .toBe(false);
    });
  });

  test("binary strings round-trip and stream is read-only", async ({ page }) => {
    const set = await page.request.post(`${apiUrl()}/nosql/tools/cli/run`, {
      data: { connectionId, input: `XADD ${prefix}:stream * a 1` },
      headers,
    });
    expect(set.ok(), await set.text()).toBeTruthy();

    // 0xff 0x00 0xfe is not UTF-8: it must come back base64 and save back unchanged.
    await insert(page, connectionId, `${prefix}:bin`, "string", "text", "//4A".slice(0, 4));
    const before = (await (await page.request.get(`${apiUrl()}/nosql/item`, {
      params: { connectionId, containerId: "db0", itemId: `${prefix}:bin` },
      headers,
    })).json()).data;
    expect(before.value).toBe("//4A");

    const stream = (await (await page.request.get(`${apiUrl()}/nosql/item`, {
      params: { connectionId, containerId: "db0", itemId: `${prefix}:stream` },
      headers,
    })).json()).data;
    expect(stream.meta.readonly).toBe(true);
    expect(stream.meta.type).toBe("stream");
  });

  test("terminal: runs commands, history, Ctrl+C, paste never runs", async ({ page }) => {
    await openDb0(page, name);
    await page.getByLabel("More actions").click();
    await page.getByRole("menuitem", { name: "CLI" }).click();
    const terminal = page.getByTestId("db-terminal");
    await expect(terminal).toBeVisible({ timeout: 15000 });
    await terminal.click();

    const type = async (text: string): Promise<void> => {
      await page.keyboard.type(text);
      await page.keyboard.press("Enter");
    };

    await type(`SET ${prefix}:cli hello`);
    await expect(terminal).toContainText("OK");
    await type(`GET ${prefix}:cli`);
    await expect(terminal).toContainText('"hello"');

    await test.step("a pasted command is shown but not executed until Enter", async () => {
      await page.evaluate(
        (text) => {
          const el = document.querySelector('[data-testid="db-terminal"]') as HTMLElement;
          const dt = new DataTransfer();
          dt.setData("text/plain", text);
          el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
        },
        `SET ${prefix}:pasted yes\nSET ${prefix}:pasted2 yes`,
      );
      const check = await page.request.get(`${apiUrl()}/nosql/item`, {
        params: { connectionId, containerId: "db0", itemId: `${prefix}:pasted` },
        headers,
      });
      expect(check.ok()).toBeFalsy();
    });

    await test.step("Ctrl+C clears the line", async () => {
      await page.keyboard.type("GET nothing");
      await page.keyboard.press("Control+C");
      await expect(terminal).toContainText("^C");
    });

    await test.step("KEYS is blocked and FLUSHDB asks for confirmation", async () => {
      const keys = await page.request.post(`${apiUrl()}/nosql/tools/cli/run`, {
        data: { connectionId, input: "KEYS *" },
        headers,
      });
      expect(keys.status()).toBe(403);
      expect((await keys.json()).message).toBe("safe_mode_blocked");

      const flush = await page.request.post(`${apiUrl()}/nosql/tools/cli/run`, {
        data: { connectionId, input: "FLUSHDB" },
        headers,
      });
      expect(flush.status()).toBe(403);
      expect((await flush.json()).message).toBe("safe_mode_confirm_required");
    });

    await test.step("guardrail: browsing used SCAN, never KEYS", async () => {
      await page.request.get(`${apiUrl()}/nosql/browse`, {
        params: { connectionId, containerId: "db0", limit: 10 },
        headers,
      });
      const stats = await page.request.post(`${apiUrl()}/nosql/tools/cli/run`, {
        data: { connectionId, input: "INFO commandstats" },
        headers,
      });
      const text = JSON.stringify((await stats.json()).data.output);
      expect(text).toContain("cmdstat_scan");
      expect(text).not.toContain("cmdstat_keys:");
    });
  });

  test("Pub/Sub: subscribe by pattern, publish, receive over SSE", async ({ page }) => {
    await openDb0(page, name);
    await page.getByLabel("More actions").click();
    await page.getByRole("menuitem", { name: "Pub/Sub" }).click();
    await page.getByLabel("pubsub-channels").fill(`${prefix}.*`);
    await page.getByRole("button", { name: "Subscribe" }).click();
    // Give the dedicated subscription a moment to register before publishing.
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
    await page.waitForTimeout(500);

    await page.getByLabel("pubsub-publish-channel").fill(`${prefix}.orders`);
    await page.getByLabel("pubsub-publish-message").fill('{"id":7}');
    await page.getByRole("button", { name: "Publish", exact: true }).click();

    await expect(page.getByTestId("pubsub-messages")).toContainText(`${prefix}.orders`, { timeout: 10000 });
    await expect(page.getByTestId("pubsub-messages")).toContainText('"id": 7');
  });

  test("bulk delete by pattern: preview, typed confirmation, background job", async ({ page }) => {
    for (let i = 0; i < 120; i++) {
      await insert(page, connectionId, `${prefix}:bulk:${i}`, "string", "text", "v");
    }
    await insert(page, connectionId, `${prefix}:keep`, "string", "text", "v");

    await openDb0(page, name);
    await page.getByLabel("browse-pattern").fill(`${prefix}:bulk:*`);
    await page.getByLabel("browse-pattern").press("Enter");
    await page.getByLabel("More actions").click();
    await page.getByRole("menuitem", { name: "Delete matching…" }).click();

    const dialog = page.getByTestId("bulk-delete-dialog");
    await expect(page.getByTestId("bulk-delete-count")).toContainText("120 keys match");
    const confirm = dialog.getByRole("button", { name: /^Delete 120 keys$/ });
    await expect(confirm).toBeDisabled();

    await test.step("the server also refuses a wrong confirmation name", async () => {
      const res = await page.request.post(`${apiUrl()}/nosql/bulk-delete`, {
        data: { connectionId, containerId: "db0", pattern: `${prefix}:bulk:*`, confirmName: "nope" },
        headers,
      });
      expect(res.status()).toBe(400);
    });

    await page.getByLabel("bulk-delete-confirm").fill(name);
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // The job worker polls every few seconds.
    await expect
      .poll(
        async () => {
          const r = await page.request.get(`${apiUrl()}/nosql/browse`, {
            params: { connectionId, containerId: "db0", filter: `${prefix}:bulk:*`, limit: 10 },
            headers,
          });
          return ((await r.json()).data.items as unknown[]).length;
        },
        { timeout: 60000, intervals: [1000] },
      )
      .toBe(0);

    const keep = await page.request.get(`${apiUrl()}/nosql/item`, {
      params: { connectionId, containerId: "db0", itemId: `${prefix}:keep` },
      headers,
    });
    expect(keep.ok()).toBeTruthy();
  });

  test("CLI runs on its own connection: SELECT there does not move the key browser", async ({ page }) => {
    const cli = async (input: string): Promise<void> => {
      const res = await page.request.post(`${apiUrl()}/nosql/tools/cli/run`, {
        data: { connectionId, input },
        headers,
      });
      expect(res.ok(), await res.text()).toBeTruthy();
    };
    await cli("SELECT 5");
    await cli(`SET ${prefix}:in5 1`);

    const inDb0 = await page.request.get(`${apiUrl()}/nosql/browse`, {
      params: { connectionId, containerId: "db0", filter: `${prefix}:in5` },
      headers,
    });
    expect(((await inDb0.json()).data.items as unknown[]).length).toBe(0);

    const inDb5 = await page.request.get(`${apiUrl()}/nosql/browse`, {
      params: { connectionId, containerId: "db5", filter: `${prefix}:in5` },
      headers,
    });
    expect(((await inDb5.json()).data.items as unknown[]).length).toBe(1);

    await page.request.post(`${apiUrl()}/nosql/items/delete`, {
      data: { connectionId, containerId: "db5", itemIds: [`${prefix}:in5`], confirmed: true },
      headers,
    });
  });
  test("recycle bin: a deleted key is restorable with its value and TTL", async ({ page }) => {
    const key = `${prefix}:recycled`;
    await insert(page, connectionId, key, "hash", "fields", { a: "1", b: "2" });
    await page.request.put(`${apiUrl()}/nosql/item`, {
      data: { connectionId, containerId: "db0", itemId: key, change: { ttlSecs: 3600 } },
      headers,
    });
    await page.request.post(`${apiUrl()}/nosql/items/delete`, {
      data: { connectionId, containerId: "db0", itemIds: [key], confirmed: true },
      headers,
    });

    const list = await page.request.get(`${apiUrl()}/nosql/recycle`, { params: { connectionId }, headers });
    const entry = ((await list.json()).data as { id: number; itemId: string }[]).find((e) => e.itemId === key);
    expect(entry).toBeTruthy();

    const restore = await page.request.post(`${apiUrl()}/nosql/recycle/${entry!.id}/restore`, {
      params: { connectionId },
      data: { confirmed: true },
      headers,
    });
    expect(restore.ok(), await restore.text()).toBeTruthy();

    const got = await page.request.get(`${apiUrl()}/nosql/item`, {
      params: { connectionId, containerId: "db0", itemId: key },
      headers,
    });
    const item = (await got.json()).data as { value: Record<string, string>; meta: { ttl: number } };
    expect(item.value).toEqual({ a: "1", b: "2" });
    expect(item.meta.ttl).toBeGreaterThan(3500);

    // Restore is single-use and never overwrites.
    const again = await page.request.post(`${apiUrl()}/nosql/recycle/${entry!.id}/restore`, {
      params: { connectionId },
      data: { confirmed: true },
      headers,
    });
    expect(again.ok()).toBeFalsy();
  });

  test("big collection: pages by window, edits one member, whole-key save is refused", async ({ page }) => {
    const key = `${prefix}:big`;
    const fields: Record<string, string> = {};
    for (let i = 0; i < 1500; i++) fields[`f${i}`] = `v${i}`;
    await insert(page, connectionId, key, "hash", "fields", fields);

    const item = await page.request.get(`${apiUrl()}/nosql/item`, {
      params: { connectionId, containerId: "db0", itemId: key },
      headers,
    });
    const meta = (await item.json()).data.meta as { truncated?: boolean; readonly?: boolean };
    expect(meta.truncated).toBe(true);
    expect(meta.readonly).toBeFalsy();

    const seen = new Set<string>();
    let cursor = "";
    let total = 0;
    do {
      const w = await page.request.get(`${apiUrl()}/nosql/item/window`, {
        params: { connectionId, containerId: "db0", itemId: key, cursor, limit: 500 },
        headers,
      });
      const data = (await w.json()).data as { members: { key: string }[]; nextCursor: string; total: number };
      data.members.forEach((m) => seen.add(m.key));
      cursor = data.nextCursor;
      total = data.total;
    } while (cursor);
    expect(total).toBe(1500);
    expect(seen.size).toBe(1500);

    const member = await page.request.post(`${apiUrl()}/nosql/item/member`, {
      data: { connectionId, containerId: "db0", itemId: key, op: { op: "set", key: "f7", value: "changed" }, confirmed: true },
      headers,
    });
    expect(member.ok(), await member.text()).toBeTruthy();

    const whole = await page.request.put(`${apiUrl()}/nosql/item`, {
      data: { connectionId, containerId: "db0", itemId: key, change: { value: { only: "one" } }, confirmed: true },
      headers,
    });
    expect(whole.status()).toBe(400);
  });
  test("prod write-lock: writes are refused until the connection name is typed, reads keep working", async ({ page }) => {
    const key = `${prefix}:prod`;
    await insert(page, connectionId, key, "string", "text", "v1");

    const patch = await page.request.patch(`${apiUrl()}/connections/${connectionId}`, { data: { env: "prod" }, headers });
    expect(patch.ok(), await patch.text()).toBeTruthy();

    const write = (value: string) =>
      page.request.put(`${apiUrl()}/nosql/item`, {
        data: { connectionId, containerId: "db0", itemId: key, change: { value }, confirmed: true },
        headers,
      });
    const locked = await write("v2");
    expect(locked.status()).toBe(403);
    expect((await locked.json()).message).toBe("safe_mode_prod_locked");

    const read = await page.request.get(`${apiUrl()}/nosql/item`, {
      params: { connectionId, containerId: "db0", itemId: key },
      headers,
    });
    expect(read.ok()).toBeTruthy();

    const unlock = (confirmName: string) =>
      page.request.post(`${apiUrl()}/connections/${connectionId}/safe-mode/unlock`, { data: { confirmName }, headers });
    const early = await page.request.patch(`${apiUrl()}/connections/${connectionId}`, { data: { env: "dev" }, headers });
    expect(early.status()).toBe(403);
    expect((await unlock("not-the-name")).ok()).toBeFalsy();
    expect((await write("v2")).status()).toBe(403);

    const ok = await unlock(name);
    expect(ok.ok(), await ok.text()).toBeTruthy();
    expect((await write("v2")).ok()).toBeTruthy();

    // Lifting the tag needs the unlock too (still active here); afterwards cleanup can delete.
    const lift = await page.request.patch(`${apiUrl()}/connections/${connectionId}`, { data: { env: "dev" }, headers });
    expect(lift.ok(), await lift.text()).toBeTruthy();
  });
  test("list: a member is removed by index even when values repeat; a stale view is refused", async ({ page }) => {
    const key = `${prefix}:dups`;
    await insert(page, connectionId, key, "list", "list", ["a", "b", "a", "c"]);
    const member = (k: string, value: string) =>
      page.request.post(`${apiUrl()}/nosql/item/member`, {
        data: { connectionId, containerId: "db0", itemId: key, op: { op: "remove", key: k, value }, confirmed: true },
        headers,
      });
    const list = async (): Promise<string[]> =>
      ((await (await page.request.get(`${apiUrl()}/nosql/item`, { params: { connectionId, containerId: "db0", itemId: key }, headers })).json()).data.value as string[]);

    expect((await member("2", "b")).ok()).toBeFalsy(); // index 2 holds "a", the view was stale
    expect(await list()).toEqual(["a", "b", "a", "c"]);
    expect((await member("2", "a")).ok()).toBeTruthy(); // the second "a", not the first
    expect(await list()).toEqual(["a", "b", "c"]);
  });

  test("grid pagination: page size from the gear, next and previous", async ({ page }) => {
    const key = `${prefix}:paged`;
    const fields: Record<string, string> = {};
    for (let i = 0; i < 250; i++) fields[`f${String(i).padStart(3, "0")}`] = `v${i}`;
    await insert(page, connectionId, key, "hash", "fields", fields);
    await openDb0(page, name);
    await page.getByLabel("browse-pattern").fill(key);
    await page.getByLabel("browse-pattern").press("Enter");
    await expect(page.getByTestId("browse-folder").first()).toBeVisible();
    const collapsed = page.getByTestId("browse-folder").filter({ hasText: "▸" });
    for (let i = 0; i < 8 && (await collapsed.count()) > 0; i++) await collapsed.first().click();
    await page.getByTestId("browse-item").first().click();

    const rows = page.getByTestId("member-row");
    await expect(page.getByTestId("status-rows")).toContainText("250 rows");
    await expect(rows).toHaveCount(100);
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(rows).toHaveCount(100);
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(rows).toHaveCount(50);
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
    await page.getByRole("button", { name: "Previous page" }).click();
    await expect(rows).toHaveCount(100);

    await page.getByTestId("pagination-settings").click();
    await page.getByPlaceholder("Limit").fill("300");
    await page.getByPlaceholder("Limit").press("Enter");
    await expect(rows).toHaveCount(250);
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
  test("member grid parity: rename a field, duplicate a row, shift-select, resize a column", async ({ page }) => {
    const key = `${prefix}:parity`;
    await insert(page, connectionId, key, "hash", "fields", { a: "1", b: "2", c: "3" });
    await openDb0(page, name);
    await page.getByLabel("browse-pattern").fill(key);
    await page.getByLabel("browse-pattern").press("Enter");
    await expect(page.getByTestId("browse-folder").first()).toBeVisible();
    const collapsed = page.getByTestId("browse-folder").filter({ hasText: "▸" });
    for (let i = 0; i < 8 && (await collapsed.count()) > 0; i++) await collapsed.first().click();
    await page.getByTestId("browse-item").first().click();

    const view = page.getByTestId("browse-item-view");
    const rows = page.getByTestId("member-row");
    await expect(rows).toHaveCount(3);

    await test.step("shift-click extends the selection over a range", async () => {
      await rows.nth(0).getByRole("checkbox").click();
      await rows.nth(2).getByRole("checkbox").click({ modifiers: ["Shift"] });
      await expect(page.getByTestId("status-rows")).toContainText("3 selected");
      await rows.nth(0).click(); // back to a single highlighted row
    });

    await test.step("column resize drags the header edge", async () => {
      const header = page.locator("th").filter({ hasText: "Field" });
      const before = (await header.boundingBox())!.width;
      const edge = header.locator("[data-resizer]");
      const box = (await edge.boundingBox())!;
      // The header clips the handle, so only its left edge is grabbable.
      await page.mouse.move(box.x + 1, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 5 });
      await page.mouse.up();
      expect((await header.boundingBox())!.width).toBeGreaterThan(before + 40);
    });

    await test.step("rename and duplicate are staged, then applied together", async () => {
      await view.getByText("a", { exact: true }).dblclick();
      await page.getByLabel("member-key").fill("alpha");
      await page.getByLabel("member-key").press("Enter");
      await view.getByText("b", { exact: true }).click({ button: "right" });
      await page.getByRole("menuitem", { name: "Duplicate row" }).click();
      await expect(page.getByTestId("status-rows")).toContainText("2 pending");
      await page.getByTestId("member-save").click();
      await expect(page.getByTestId("status-rows")).toContainText("4 rows");
      const w = await page.request.get(`${apiUrl()}/nosql/item/window`, { params: { connectionId, containerId: "db0", itemId: key }, headers });
      const got = Object.fromEntries(((await w.json()).data.members as { key: string; value: string }[]).map((m) => [m.key, m.value]));
      expect(got).toEqual({ alpha: "1", b: "2", c: "3", b_copy: "2" });
    });
  });
  test("prod lock in the UI: a write asks for the connection name, then goes through", async ({ page }) => {
    const key = `${prefix}:produi`;
    await insert(page, connectionId, key, "hash", "fields", { f: "1" });
    const patch = await page.request.patch(`${apiUrl()}/connections/${connectionId}`, { data: { env: "prod" }, headers });
    expect(patch.ok(), await patch.text()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
    await openDb0(page, name);
    await page.getByLabel("browse-pattern").fill(key);
    await page.getByLabel("browse-pattern").press("Enter");
    await expect(page.getByTestId("browse-folder").first()).toBeVisible();
    const collapsed = page.getByTestId("browse-folder").filter({ hasText: "▸" });
    for (let i = 0; i < 8 && (await collapsed.count()) > 0; i++) await collapsed.first().click();
    await page.getByTestId("browse-item").first().click();

    await page.getByTestId("member-row").getByText("1", { exact: true }).dblclick();
    await page.getByLabel("member-value").fill("2");
    await page.getByLabel("member-value").press("Enter");
    await page.getByTestId("member-save").click();

    const dialog = page.getByTestId("prod-unlock-dialog");
    await expect(dialog).toBeVisible();
    const unlock = dialog.getByRole("button", { name: /unlock/i });
    await expect(unlock).toBeDisabled();
    await dialog.getByLabel("prod-unlock-confirm").fill("not-the-name");
    await expect(unlock).toBeDisabled();
    await dialog.getByLabel("prod-unlock-confirm").fill(name);
    await unlock.click();

    await expect(page.getByTestId("status-rows")).not.toContainText("pending");
    const w = await page.request.get(`${apiUrl()}/nosql/item/window`, { params: { connectionId, containerId: "db0", itemId: key }, headers });
    expect(((await w.json()).data.members as { key: string; value: string }[])[0].value).toBe("2");

    // Lift the tag again (the unlock is still active) so cleanup can delete.
    await page.request.patch(`${apiUrl()}/connections/${connectionId}`, { data: { env: "dev" }, headers });
  });
  test("SQL autocomplete on a NoSQL connection answers empty instead of failing", async ({ page }) => {
    const res = await page.request.get(`${apiUrl()}/query/autocomplete`, { params: { connectionId }, headers });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).data.tables).toEqual([]);
  });
});

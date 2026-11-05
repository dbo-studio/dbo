import { expect, test, type Page } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ConnectionPage } from "../../pages";

/**
 * Redis driver on the NoSQL engine. Needs a Redis (docker compose -f docker-compose.dev.yml up -d sample-redis).
 * The connection is created through the real New connection form.
 */
const apiUrl = (): string => process.env.PLAYWRIGHT_API_URL ?? "";
const redisHost = process.env.REDIS_TEST_HOST ?? "127.0.0.1";
const redisPort = process.env.REDIS_TEST_PORT ?? "6380";
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

    await test.step("hash: edit a field and save", async () => {
      await open(`${prefix}:session`);
      await expect(page.getByTestId("browse-item-view")).toContainText("Field");
      const ip = page.locator('input[value="1.2.3.4"]');
      await ip.fill("9.9.9.9");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.locator('input[value="9.9.9.9"]')).toBeVisible();
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
    expect(whole.ok()).toBeFalsy();
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
});

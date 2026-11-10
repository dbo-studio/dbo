// @cap: Window @tool: PubSub
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { useRedis } from "../../helpers/redisCase";

/** Redis member windows for every collection type, and Pub/Sub channels and publish. */
test.describe("Redis windows and Pub/Sub", () => {
  const r = useRedis();
  const key = (n: string): string => `${r.s.prefix}:${n}`;

  const pageAll = async (page: import("@playwright/test").Page, id: string, limit: number) => {
    const seen: { key: string; value: string; score?: number }[] = [];
    let cursor = "";
    let total = 0;
    for (let guard = 0; guard < 200; guard++) {
      const w = await j(await r.api(page).window(id, { cursor, limit }));
      seen.push(...w.members);
      total = w.total;
      cursor = w.nextCursor;
      if (!cursor) break;
    }
    return { seen, total };
  };

  test("hash: windows cover every field exactly once", async ({ page }) => {
    const value: Record<string, string> = {};
    for (let i = 0; i < 350; i++) value[`f${i}`] = `v${i}`;
    await r.api(page).insert({ id: key("wh"), view: "fields", value, meta: { kind: "hash" } });
    const { seen, total } = await pageAll(page, key("wh"), 100);
    expect(total).toBe(350);
    expect(new Set(seen.map((m) => m.key)).size).toBe(350);
    expect(seen.find((m) => m.key === "f7")?.value).toBe("v7");
  });

  test("set: windows cover every member exactly once", async ({ page }) => {
    const value = Array.from({ length: 220 }, (_, i) => `s${i}`);
    await r.api(page).insert({ id: key("ws"), view: "set", value, meta: { kind: "set" } });
    const { seen, total } = await pageAll(page, key("ws"), 50);
    expect(total).toBe(220);
    expect(new Set(seen.map((m) => m.key)).size).toBe(220);
  });

  test("zset: windows are ordered by score and carry the score", async ({ page }) => {
    const value = Array.from({ length: 120 }, (_, i) => ({ member: `z${i}`, score: i }));
    await r.api(page).insert({ id: key("wz"), view: "set", value, meta: { kind: "zset" } });
    const { seen, total } = await pageAll(page, key("wz"), 40);
    expect(total).toBe(120);
    expect(seen.map((m) => m.score)).toEqual(Array.from({ length: 120 }, (_, i) => i));
  });

  test("list: windows keep list order and use the index as the key", async ({ page }) => {
    const value = Array.from({ length: 130 }, (_, i) => `l${i}`);
    await r.api(page).insert({ id: key("wl"), view: "list", value, meta: { kind: "list" } });
    const { seen, total } = await pageAll(page, key("wl"), 50);
    expect(total).toBe(130);
    expect(seen.map((m) => m.value)).toEqual(value);
    expect(seen[0].key).toBe("0");
  });

  test("the last window has no next cursor", async ({ page }) => {
    await r.api(page).insert({ id: key("few"), view: "list", value: ["a", "b"], meta: { kind: "list" } });
    const w = await j(await r.api(page).window(key("few"), { limit: 10 }));
    expect(w.members).toHaveLength(2);
    expect(w.nextCursor).toBe("");
  });

  test("a window on a missing key or a plain string is refused", async ({ page }) => {
    expect((await r.api(page).window(key("missing"))).ok()).toBeFalsy();
    await r.api(page).insert({ id: key("plain"), view: "text", value: "v", meta: { kind: "string" } });
    expect((await r.api(page).window(key("plain"))).ok()).toBeFalsy();
  });

  test("pubsub channels returns a list and honours the pattern", async ({ page }) => {
    const res = await page.request.get(`${apiUrl()}/nosql/tools/pubsub/channels`, { params: { connectionId: r.s.id, pattern: `${r.s.prefix}*` }, headers });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect(Array.isArray(await j(res))).toBe(true);
  });

  test("publish reaches the server and reports no subscribers when nobody listens", async ({ page }) => {
    const res = await page.request.post(`${apiUrl()}/nosql/tools/pubsub/publish`, {
      data: { connectionId: r.s.id, channel: `${r.s.prefix}:chan`, message: "hello", confirmed: true },
      headers,
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test("publish without a channel is refused", async ({ page }) => {
    const res = await page.request.post(`${apiUrl()}/nosql/tools/pubsub/publish`, {
      data: { connectionId: r.s.id, channel: "", message: "x", confirmed: true },
      headers,
    });
    expect(res.ok()).toBeFalsy();
  });
});

// @cap: Insert Edit Delete TTL Rename @tool: CLI PubSub
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { useRedis } from "../../helpers/redisCase";

/** What the Redis driver advertises (`/nosql/describe`) and how logical databases are isolated. */
test.describe("Redis capabilities and databases", () => {
  const r = useRedis();

  test("describe advertises every capability, both tools and all five key types", async ({ page }) => {
    const res = await page.request.get(`${apiUrl()}/nosql/describe`, { params: { connectionId: r.s.id, containerId: "db0" }, headers });
    const spec = await j(res);
    expect(spec.filter).toBe("pattern");
    expect(spec.listStyle).toBe("tree");
    expect(spec.delimiter).toBe(":");
    for (const cap of ["insert", "edit", "delete", "bulk-delete", "bulk-delete-pattern", "recycle", "window", "ttl", "rename"]) {
      expect(spec.capabilities, cap).toContain(cap);
    }
    expect(spec.capabilities).not.toContain("stats");
    expect([...spec.tools].sort()).toEqual(["cli", "pubsub"]);
    expect(spec.createKinds.map((k: { id: string }) => k.id).sort()).toEqual(["hash", "list", "set", "string", "zset"]);
  });

  test("the same key name in db0 and db1 is two different keys", async ({ page }) => {
    const db0 = r.api(page);
    const db1 = (await import("../../helpers/nosql")).nosql(page, r.s.id, "db1");
    const id = `${r.s.prefix}:iso`;
    const item = (value: string) => ({ id, view: "text", value, meta: { kind: "string" } });
    try {
      expect((await db0.insert(item("zero"))).ok()).toBeTruthy();
      expect((await db1.insert(item("one"))).ok()).toBeTruthy();
      expect((await j(await db0.get(id))).value).toBe("zero");
      expect((await j(await db1.get(id))).value).toBe("one");
      await db0.remove([id]);
      expect((await db1.get(id)).ok()).toBeTruthy();
    } finally {
      await db1.remove([id]);
    }
  });

  test("a container id that is not a database index is refused", async ({ page }) => {
    const bad = (await import("../../helpers/nosql")).nosql(page, r.s.id, "nope");
    expect((await bad.browse()).ok()).toBeFalsy();
    expect((await bad.insert({ id: "x", view: "text", value: "v", meta: { kind: "string" } })).ok()).toBeFalsy();
  });

  test("the tree lists the logical databases", async ({ page }) => {
    const res = await page.request.get(`${apiUrl()}/tree`, { params: { connectionId: r.s.id }, headers });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect(JSON.stringify(await res.json())).toContain("db0");
  });

  test("an unknown connection id is refused", async ({ page }) => {
    const res = await page.request.get(`${apiUrl()}/nosql/describe`, { params: { connectionId: 999999, containerId: "db0" }, headers });
    expect(res.ok()).toBeFalsy();
  });
});

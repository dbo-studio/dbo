import { expect, test } from "@playwright/test";
import { j } from "../../helpers/nosql";
import { useRedis } from "../../helpers/redisCase";

/** Redis TTL (set, persist) and rename, including collisions and the recycle bin. */
test.describe("Redis TTL and rename", () => {
  const r = useRedis();
  const key = (n: string): string => `${r.s.prefix}:${n}`;
  const text = (id: string, value = "v") => ({ id, view: "text", value, meta: { kind: "string" } });

  test("a new key has no expiry", async ({ page }) => {
    const api = r.api(page);
    await api.insert(text(key("fresh")));
    expect((await j(await api.get(key("fresh")))).meta.ttl).toBeLessThanOrEqual(0);
  });

  test("setting a TTL is reported in seconds", async ({ page }) => {
    const api = r.api(page);
    await api.insert(text(key("a")));
    expect((await api.save(key("a"), { ttlSecs: 3600 })).ok()).toBeTruthy();
    const ttl = (await j(await api.get(key("a")))).meta.ttl as number;
    expect(ttl).toBeGreaterThan(3500);
    expect(ttl).toBeLessThanOrEqual(3600);
  });

  test("a TTL of 0 removes the expiry", async ({ page }) => {
    const api = r.api(page);
    await api.insert(text(key("p")));
    await api.save(key("p"), { ttlSecs: 600 });
    expect((await api.save(key("p"), { ttlSecs: 0 })).ok()).toBeTruthy();
    expect((await j(await api.get(key("p")))).meta.ttl).toBeLessThanOrEqual(0);
  });

  test("a key with a short TTL expires on its own", async ({ page }) => {
    const api = r.api(page);
    await api.insert(text(key("short")));
    await api.save(key("short"), { ttlSecs: 1 });
    await expect.poll(async () => (await api.get(key("short"))).ok(), { timeout: 10000, intervals: [500] }).toBe(false);
  });

  test("rename moves the value and the TTL", async ({ page }) => {
    const api = r.api(page);
    await api.insert(text(key("from"), "payload"));
    await api.save(key("from"), { ttlSecs: 900 });
    expect((await api.save(key("from"), { newId: key("to") })).ok()).toBeTruthy();
    expect((await api.get(key("from"))).ok()).toBeFalsy();
    const moved = await j(await api.get(key("to")));
    expect(moved.value).toBe("payload");
    expect(moved.meta.ttl).toBeGreaterThan(800);
  });

  test("rename never overwrites an existing key", async ({ page }) => {
    const api = r.api(page);
    await api.insert(text(key("one"), "1"));
    await api.insert(text(key("two"), "2"));
    const res = await api.save(key("one"), { newId: key("two") });
    expect(res.status()).toBe(400);
    expect((await j(await api.get(key("one")))).value).toBe("1");
    expect((await j(await api.get(key("two")))).value).toBe("2");
  });

  test("renaming a key to itself is a no-op", async ({ page }) => {
    const api = r.api(page);
    await api.insert(text(key("same"), "s"));
    expect((await api.save(key("same"), { newId: key("same") })).ok()).toBeTruthy();
    expect((await j(await api.get(key("same")))).value).toBe("s");
  });

  test("rename keeps the type of a collection", async ({ page }) => {
    const api = r.api(page);
    await api.insert({ id: key("h1"), view: "fields", value: { a: "1" }, meta: { kind: "hash" } });
    await api.save(key("h1"), { newId: key("h2") });
    const got = await j(await api.get(key("h2")));
    expect(got.meta.type).toBe("hash");
    expect(got.value).toEqual({ a: "1" });
  });

  test("value, TTL and rename can be changed in one save", async ({ page }) => {
    const api = r.api(page);
    await api.insert(text(key("combo"), "old"));
    expect((await api.save(key("combo"), { value: "new", ttlSecs: 500, newId: key("combo2") })).ok()).toBeTruthy();
    const got = await j(await api.get(key("combo2")));
    expect(got.value).toBe("new");
    expect(got.meta.ttl).toBeGreaterThan(400);
  });
});

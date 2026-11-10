import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { connectionInfo, createNoSqlConnection, ping, redisHost, redisPort } from "../../helpers/nosql";

/** Redis connection layer: form, ping classification, option validation, driver family. */
const base = { host: redisHost, port: Number(redisPort) };

test.describe("Redis connection", () => {
  test("created through the form, reports the server version", async ({ page }, testInfo) => {
    const id = await createNoSqlConnection(page, "redis", `redis-conn-${uniqueTestSuffix(testInfo)}`);
    const conn = await connectionInfo(page, id);
    expect(conn.type).toBe("redis");
    expect(conn.info).toMatch(/\d+\.\d+/);
    expect(conn.options.password ?? "").toBe("");
  });

  test("ping succeeds and returns a version", async ({ page }) => {
    await page.goto("/");
    const ok = await ping(page, "redis", base);
    expect(ok.status).toBe(200);
    expect(ok.body.data?.serverVersion).toMatch(/\d+\.\d+/);
  });

  test("ping classifies a closed port as a network failure", async ({ page }) => {
    await page.goto("/");
    const bad = await ping(page, "redis", { host: redisHost, port: 1 });
    expect(bad.status).toBe(400);
    expect(bad.body.data?.category).toBe("network");
  });

  test("ping rejects invalid options", async ({ page }) => {
    await page.goto("/");
    expect((await ping(page, "redis", { port: 6379 })).status).toBe(400); // no host
    expect((await ping(page, "redis", { host: redisHost, port: 0 })).status).toBe(400);
    expect((await ping(page, "redis", { host: redisHost, port: 70000 })).status).toBe(400);
    expect((await ping(page, "redis", { ...base, database: 5000 })).status).toBe(400);
    expect((await ping(page, "redis", { ...base, database: -1 })).status).toBe(400);
  });

  test("ping rejects an unknown connection type", async ({ page }) => {
    await page.goto("/");
    expect((await ping(page, "not-a-db", base)).status).toBe(400);
  });

  test("a non-default database index is accepted", async ({ page }) => {
    await page.goto("/");
    expect((await ping(page, "redis", { ...base, database: 3 })).status).toBe(200);
  });

  test("the Redis family (valkey, keydb, dragonfly) is served by the same driver", async ({ page }) => {
    await page.goto("/");
    for (const type of ["valkey", "keydb", "dragonfly"]) {
      const res = await ping(page, type, base);
      expect(res.status, type).toBe(200);
    }
  });

  test("wrong credentials never succeed", async ({ page }) => {
    await page.goto("/");
    const res = await ping(page, "redis", { ...base, username: "nobody", password: "wrong" });
    expect(res.status).toBe(400);
  });
});

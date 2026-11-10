import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { connectionInfo, createNoSqlConnection, mongoHost, mongoPort, ping } from "../../helpers/nosql";

/** MongoDB connection layer: form, ping classification, URI and option validation. */
const base = { host: mongoHost, port: Number(mongoPort) };

test.describe("MongoDB connection", () => {
  test("created through the form, reports the server version", async ({ page }, testInfo) => {
    const id = await createNoSqlConnection(page, "mongo", `mongo-conn-${uniqueTestSuffix(testInfo)}`);
    const conn = await connectionInfo(page, id);
    expect(conn.type).toBe("mongodb");
    expect(conn.info).toMatch(/\d+\.\d+/);
    expect(conn.options.password ?? "").toBe("");
  });

  test("ping succeeds and returns a version", async ({ page }) => {
    await page.goto("/");
    const ok = await ping(page, "mongodb", base);
    expect(ok.status).toBe(200);
    expect(ok.body.data?.serverVersion).toMatch(/\d+\.\d+/);
  });

  test("ping works with a connection string", async ({ page }) => {
    await page.goto("/");
    const res = await ping(page, "mongodb", { uri: `mongodb://${mongoHost}:${mongoPort}` });
    expect(res.status).toBe(200);
  });

  test("ping classifies a closed port as a network failure", async ({ page }) => {
    await page.goto("/");
    const bad = await ping(page, "mongodb", { host: mongoHost, port: 1 });
    expect(bad.status).toBe(400);
    expect(bad.body.data?.category).toBe("network");
  });

  test("ping rejects invalid options", async ({ page }) => {
    await page.goto("/");
    expect((await ping(page, "mongodb", { port: 27017 })).status).toBe(400); // no host
    expect((await ping(page, "mongodb", { host: mongoHost, port: 0 })).status).toBe(400);
    expect((await ping(page, "mongodb", { host: mongoHost, port: 70000 })).status).toBe(400);
  });

  test("a connection string must use the mongodb scheme", async ({ page }) => {
    await page.goto("/");
    expect((await ping(page, "mongodb", { uri: "http://example.com" })).status).toBe(400);
    expect((await ping(page, "mongodb", { uri: "postgres://example.com" })).status).toBe(400);
  });

  test("wrong credentials never succeed", async ({ page }) => {
    await page.goto("/");
    const res = await ping(page, "mongodb", { ...base, username: "nobody", password: "wrong", authSource: "admin" });
    expect(res.status).toBe(400);
  });

  test("an unknown database name still connects (it is created lazily)", async ({ page }) => {
    await page.goto("/");
    expect((await ping(page, "mongodb", { ...base, database: "e2e_does_not_exist" })).status).toBe(200);
  });
});

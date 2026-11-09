import { test, type Page } from "@playwright/test";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { createNoSqlConnection, j, nosql } from "./nosql";

export { KINDS } from "./nosql";

/**
 * Registers beforeEach/afterEach for a Redis spec: one connection per test, a unique key prefix,
 * and cleanup of only that prefix (the shared Redis is never flushed). Call inside test.describe.
 */
export function useRedis() {
  const s = { name: "", id: 0, prefix: "" };

  test.beforeEach(async ({ page }, testInfo) => {
    s.name = `redis-${uniqueTestSuffix(testInfo)}`;
    s.prefix = `e2e:${uniqueTestSuffix(testInfo)}`;
    s.id = await createNoSqlConnection(page, "redis", s.name);
  });

  test.afterEach(async ({ page }) => {
    const api = nosql(page, s.id, "db0");
    const keys = ((await j(await api.browse({ filter: `${s.prefix}*`, limit: 500 })))?.items ?? []).map(
      (i: { id: string }) => i.id,
    );
    if (keys.length) await api.remove(keys);
  });

  return { s, api: (page: Page) => nosql(page, s.id, "db0") };
}

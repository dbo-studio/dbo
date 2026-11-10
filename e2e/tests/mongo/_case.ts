import { execFileSync } from "node:child_process";
import { test, type Page } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { createNoSqlConnection, nosql } from "../../helpers/nosql";

const mongoContainer = process.env.MONGO_TEST_CONTAINER ?? "dbo-studio-sample-mongo";
export const db = "test";

/** One connection and one throwaway collection per test; only that collection is dropped afterwards. */
export function useMongo(tag: string) {
  const s = { name: "", id: 0, coll: "", container: "" };

  test.beforeEach(async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    s.coll = `${tag}_${suffix}`.slice(0, 60);
    s.container = `${db}/${s.coll}`;
    s.name = `mongo-${suffix}`;
    s.id = await createNoSqlConnection(page, "mongo", s.name);
  });

  test.afterEach(() => {
    try {
      execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", db, "--eval", `db.getCollection(${JSON.stringify(s.coll)}).drop()`], { stdio: "ignore" });
    } catch {
      /* docker is optional for cleanup */
    }
  });

  return {
    s,
    api: (page: Page) => nosql(page, s.id, s.container),
    add: async (page: Page, value: string): Promise<string> => {
      const res = await nosql(page, s.id, s.container).insert({ id: "", view: "document", value, meta: { kind: "document" } });
      return ((await res.json()).data as { id: string }).id;
    },
  };
}

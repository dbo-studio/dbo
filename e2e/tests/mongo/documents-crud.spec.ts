import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { createNoSqlConnection, j, nosql } from "../../helpers/nosql";

/** MongoDB document create / read / edit / delete, Extended JSON types, filters, paging and validation. */
const mongoContainer = process.env.MONGO_TEST_CONTAINER ?? "dbo-studio-sample-mongo";
const db = "test";

test.describe("MongoDB documents CRUD", () => {
  let id = 0;
  let coll = "";
  let container = "";

  test.beforeEach(async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    coll = `crud_${suffix}`.slice(0, 60);
    container = `${db}/${coll}`;
    id = await createNoSqlConnection(page, "mongo", `mongo-${suffix}`);
  });

  test.afterEach(() => {
    try {
      execFileSync("docker", ["exec", mongoContainer, "mongosh", "--quiet", db, "--eval", `db.getCollection(${JSON.stringify(coll)}).drop()`], { stdio: "ignore" });
    } catch {
      /* docker is optional for cleanup */
    }
  });

  const api = (page: import("@playwright/test").Page) => nosql(page, id, container);
  const doc = (value: string) => ({ id: "", view: "document", value, meta: { kind: "document" } });
  const add = async (page: import("@playwright/test").Page, value: string): Promise<string> => {
    const res = await api(page).insert(doc(value));
    expect(res.ok(), await res.text()).toBeTruthy();
    return (await j(res)).id as string;
  };

  test("create, read back, replace, delete", async ({ page }) => {
    const a = api(page);
    const docId = await add(page, '{"name":"alice","n":1}');
    expect(docId).toMatch(/^[0-9a-f]{24}$/);
    expect((await j(await a.get(docId))).value).toContain('"alice"');

    const edited = (await j(await a.get(docId))).value.replace('"alice"', '"alice2"');
    expect((await a.save(docId, { value: edited })).ok()).toBeTruthy();
    expect((await j(await a.get(docId))).value).toContain('"alice2"');

    expect((await a.remove([docId])).ok()).toBeTruthy();
    expect((await a.get(docId)).ok()).toBeFalsy();
  });

  test("a document with an explicit _id keeps it", async ({ page }) => {
    const docId = await add(page, '{"_id":"custom-1","x":1}');
    expect(docId).toBe("custom-1");
    expect((await j(await api(page).get("custom-1"))).value).toContain('"x"');
  });

  test("inserting a duplicate _id is refused", async ({ page }) => {
    await add(page, '{"_id":"dup","x":1}');
    expect((await api(page).insert(doc('{"_id":"dup","x":2}'))).status()).toBe(400);
  });

  test("invalid JSON is refused", async ({ page }) => {
    const a = api(page);
    expect((await a.insert(doc("{not json"))).status()).toBe(400);
    expect((await a.insert(doc("[1,2,3]"))).status()).toBe(400); // a document must be an object
    expect((await a.insert(doc(""))).status()).toBe(400);
  });

  test("the _id cannot be changed by an edit", async ({ page }) => {
    const a = api(page);
    const docId = await add(page, '{"k":1}');
    const value = (await j(await a.get(docId))).value.replace(docId, "ffffffffffffffffffffffff");
    expect((await a.save(docId, { value })).status()).toBe(400);
  });

  test("an edit that is not valid JSON leaves the document unchanged", async ({ page }) => {
    const a = api(page);
    const docId = await add(page, '{"k":1}');
    expect((await a.save(docId, { value: "{broken" })).status()).toBe(400);
    expect((await j(await a.get(docId))).value).toContain('"k"');
  });

  test("reading or saving a missing document is a clean error", async ({ page }) => {
    const a = api(page);
    expect((await a.get("ffffffffffffffffffffffff")).ok()).toBeFalsy();
    expect((await a.save("ffffffffffffffffffffffff", { value: '{"a":1}' })).ok()).toBeFalsy();
  });

  test("Extended JSON types survive a round trip", async ({ page }) => {
    const a = api(page);
    const docId = await add(
      page,
      JSON.stringify({
        i32: { $numberInt: "7" },
        i64: { $numberLong: "9007199254740993" },
        dbl: { $numberDouble: "1.5" },
        dec: { $numberDecimal: "12.34" },
        when: { $date: { $numberLong: "1700000000000" } },
        oid: { $oid: "507f1f77bcf86cd799439011" },
        bin: { $binary: { base64: "//4A", subType: "00" } },
        nested: { list: [1, "two", null, true], deep: { a: { b: 1 } } },
        nul: null,
        uni: "日本語 🚀",
      }),
    );
    const v = (await j(await a.get(docId))).value as string;
    for (const needle of ['"$numberInt":"7"', '"$numberLong":"9007199254740993"', '"$numberDecimal":"12.34"', '"$date"', '"$oid":"507f1f77bcf86cd799439011"', '"$binary"', "日本語 🚀"]) {
      expect(v, needle).toContain(needle);
    }
    // Saving the unchanged value must not alter the types.
    expect((await a.save(docId, { value: v })).ok()).toBeTruthy();
    const again = (await j(await a.get(docId))).value as string;
    expect(JSON.parse(again)).toEqual(JSON.parse(v));
  });

  test("a large document is stored and read back whole", async ({ page }) => {
    const big = "x".repeat(200_000);
    const docId = await add(page, JSON.stringify({ big }));
    expect((await j(await api(page).get(docId))).value).toContain(big);
  });

  test("delete removes several documents and ignores ids that do not exist", async ({ page }) => {
    const a = api(page);
    const one = await add(page, '{"n":1}');
    const two = await add(page, '{"n":2}');
    expect((await a.remove([one, two, "ffffffffffffffffffffffff"])).ok()).toBeTruthy();
    expect((await j(await a.browse())).items).toEqual([]);
  });

  test.describe("browse", () => {
    const seed = async (page: import("@playwright/test").Page): Promise<void> => {
      for (const d of [
        '{"name":"alice","age":{"$numberInt":"30"},"tag":"a"}',
        '{"name":"bob","age":{"$numberInt":"41"},"tag":"b"}',
        '{"name":"carol","age":{"$numberInt":"52"},"tag":"a"}',
        '{"name":"dave","tag":"c"}',
      ]) await add(page, d);
    };
    const names = async (page: import("@playwright/test").Page, params: Record<string, string | number>): Promise<string[]> =>
      ((await j(await api(page).browse(params))).items as { value: string }[]).map((i) => JSON.parse(i.value).name).sort();

    test("an empty filter lists every document", async ({ page }) => {
      await seed(page);
      expect(await names(page, {})).toEqual(["alice", "bob", "carol", "dave"]);
    });

    test("comparison, logical and existence operators", async ({ page }) => {
      await seed(page);
      expect(await names(page, { filter: '{"age":{"$gt":35}}' })).toEqual(["bob", "carol"]);
      expect(await names(page, { filter: '{"age":{"$lte":30}}' })).toEqual(["alice"]);
      expect(await names(page, { filter: '{"tag":{"$in":["a","c"]}}' })).toEqual(["alice", "carol", "dave"]);
      expect(await names(page, { filter: '{"$or":[{"name":"bob"},{"name":"dave"}]}' })).toEqual(["bob", "dave"]);
      expect(await names(page, { filter: '{"age":{"$exists":false}}' })).toEqual(["dave"]);
      expect(await names(page, { filter: '{"name":{"$regex":"^a"}}' })).toEqual(["alice"]);
    });

    test("a filter that matches nothing returns an empty page", async ({ page }) => {
      await seed(page);
      expect(await names(page, { filter: '{"name":"nobody"}' })).toEqual([]);
    });

    test("an invalid filter and server-side JavaScript are refused", async ({ page }) => {
      await seed(page);
      expect((await api(page).browse({ filter: "{oops" })).status()).toBe(400);
      expect((await api(page).browse({ filter: '{"$where":"1==1"}' })).status()).toBe(403);
      expect((await api(page).browse({ filter: '{"$function":{"body":"x","args":[],"lang":"js"}}' })).ok()).toBeFalsy();
    });

    test("a limit pages through every document with the cursor and never repeats one", async ({ page }) => {
      for (let i = 0; i < 25; i++) await add(page, `{"n":${i}}`);
      const seen = new Set<string>();
      let cursor = "";
      for (let guard = 0; guard < 50; guard++) {
        const res = await j(await api(page).browse({ limit: 10, cursor }));
        for (const it of res.items as { id: string }[]) {
          expect(seen.has(it.id)).toBe(false);
          seen.add(it.id);
        }
        cursor = res.nextCursor;
        if (!cursor) break;
      }
      expect(seen.size).toBe(25);
    });

    test("a limit above the maximum is clamped, not rejected", async ({ page }) => {
      await add(page, '{"n":1}');
      expect((await api(page).browse({ limit: 1_000_000 })).ok()).toBeTruthy();
    });
  });

  test.describe("terminal", () => {
    const run = (page: import("@playwright/test").Page, input: string, confirmed = true) => api(page).cli(`${input}`, confirmed);

    test("insert, find, update, count and delete", async ({ page }) => {
      const out = async (input: string): Promise<any> => {
        const res = await nosql(page, id, container).cli(input, true);
        expect(res.ok(), `${input}: ${await res.text()}`).toBeTruthy();
        return (await res.json()).data.output;
      };
      await out(`use ${db}`);
      await out(`db.${coll}.insertOne({"name":"t1","n":1})`);
      await out(`db.${coll}.insertMany([{"name":"t2","n":2},{"name":"t3","n":3}])`);
      expect(await out(`db.${coll}.countDocuments({})`)).toBe(3);
      expect((await out(`db.${coll}.find({"n":{"$gte":2}}).sort({"n":-1}).limit(1)`))[0].name).toBe("t3");
      expect((await out(`db.${coll}.updateOne({"name":"t1"},{"$set":{"n":10}})`)).modifiedCount).toBe(1);
      expect((await out(`db.${coll}.updateMany({"n":{"$gt":1}},{"$inc":{"n":1}})`)).modifiedCount).toBe(3);
      expect(await out(`db.${coll}.deleteOne({"name":"t2"})`)).toMatchObject({ deletedCount: 1 });
      expect(await out(`db.${coll}.countDocuments({})`)).toBe(2);
      expect(await out("show collections")).toContain(coll);
      expect(await out("show dbs")).toBeTruthy();
    });

    test("writes outside the collection and server-side JavaScript are refused", async ({ page }) => {
      for (const bad of [
        `db.${coll}.find({"$where":"1==1"})`,
        `db.${coll}.aggregate([{"$out":"copy"}])`,
        `db.${coll}.aggregate([{"$merge":{"into":"copy"}}])`,
        "db.dropDatabase()",
        "rm -rf /",
        "process.exit(1)",
      ]) {
        const res = await run(page, bad);
        expect(res.status(), bad).toBe(403);
      }
    });

    test("a destructive statement needs explicit confirmation", async ({ page }) => {
      const res = await run(page, `db.${coll}.deleteMany({})`, false);
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe("safe_mode_confirm_required");
    });

    test("a malformed statement is a clean error", async ({ page }) => {
      expect((await run(page, `db.${coll}.find(`)).ok()).toBeFalsy();
      expect((await run(page, "   ")).ok()).toBeFalsy();
    });
  });
});

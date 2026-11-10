// @tool: CLI
import { expect, test } from "@playwright/test";
import { apiUrl, headers } from "../../helpers/nosql";
import { db, useMongo } from "./_case";

/** The shell accepts what people paste from mongosh: loose syntax, helpers, several statements and more methods. */
test.describe("MongoDB shell", () => {
  const m = useMongo("sh");

  const run = (page: import("@playwright/test").Page, input: string, confirmed = true) =>
    page.request.post(`${apiUrl()}/nosql/tools/cli/run`, { data: { connectionId: m.s.id, input, confirmed }, headers });
  const out = async (page: import("@playwright/test").Page, input: string): Promise<any> => {
    const res = await run(page, input);
    expect(res.ok(), `${input}: ${await res.text()}`).toBeTruthy();
    return (await res.json()).data.output;
  };
  const ref = (): string => `db.${m.s.coll}`;

  test("single quotes, unquoted keys, trailing commas, comments, regex and value helpers", async ({ page }) => {
    await out(page, `use ${db}`);
    await out(page, `${ref()}.insertMany([{name: 'alice', age: 30, tags: ['a', 'b',],}, {name: "bob", age: 41}, {name: 'Carol', age: 52}]) // three people`);

    expect(await out(page, `${ref()}.countDocuments({age: {$gt: 35}})`)).toBe(2);
    expect((await out(page, `${ref()}.find({name: /^c/i})`)).map((d: { name: string }) => d.name)).toEqual(["Carol"]);
    expect((await out(page, `${ref()}.find({'name': 'alice'}, {name: 1, _id: 0})`))).toEqual([{ name: "alice" }]);

    await out(page, `${ref()}.insertOne({_id: ObjectId('507f1f77bcf86cd799439011'), at: ISODate('2024-01-02T03:04:05Z'), n: NumberLong(7), big: NumberDecimal('1.50')})`);
    const [doc] = await out(page, `${ref()}.find({_id: ObjectId('507f1f77bcf86cd799439011')})`);
    expect(doc._id).toEqual({ $oid: "507f1f77bcf86cd799439011" });
    expect(doc.at.$date).toMatch(/^2024-01-02T03:04:05/);
    expect(doc.n).toEqual(7);
    expect(await out(page, `${ref()}.countDocuments({at: {$gte: new Date('2024-01-01')}})`)).toBe(1);
  });

  test("several statements run in order; one entry per statement comes back", async ({ page }) => {
    const result = await out(page, `use ${db};\n${ref()}.insertOne({k: 1});\n${ref()}.insertOne({k: 2})\n${ref()}.countDocuments({})`);
    expect(result.map((r: { statement: string }) => r.statement)).toEqual([
      `use ${db}`,
      `${ref()}.insertOne({"k": 1})`,
      `${ref()}.insertOne({"k": 2})`,
      `${ref()}.countDocuments({})`,
    ]);
    expect(result[3].output).toBe(2);

    await test.step("an unknown method is blocked before anything runs", async () => {
      const res = await run(page, `${ref()}.insertOne({k: 3}); ${ref()}.nope()`);
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe("safe_mode_blocked");
      expect(await out(page, `${ref()}.countDocuments({})`)).toBe(2);
    });

    await test.step("a failing statement names itself and stops the rest", async () => {
      const res = await run(page, `${ref()}.insertOne({_id: 'dup'}); ${ref()}.insertOne({_id: 'dup'}); ${ref()}.insertOne({k: 4})`);
      expect(res.ok()).toBeFalsy();
      expect((await res.json()).message).toContain(`${ref()}.insertOne({"_id": "dup"})`);
      expect(await out(page, `${ref()}.countDocuments({})`)).toBe(3);
    });

    await test.step("the strictest statement decides the safety class", async () => {
      const res = await run(page, `${ref()}.countDocuments({}); ${ref()}.deleteMany({})`, false);
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe("safe_mode_confirm_required");
      expect(await out(page, `${ref()}.countDocuments({})`)).toBe(3);
    });
  });

  test("collection names with dots through getCollection, and createCollection", async ({ page }) => {
    const dotted = `${m.s.coll}.dots`;
    await out(page, `use ${db}`);
    await out(page, `db.createCollection('${dotted}')`);
    expect(await out(page, "show collections")).toContain(dotted);
    await out(page, `db.getCollection('${dotted}').insertOne({a: 1})`);
    expect(await out(page, `db.getCollection("${dotted}").countDocuments({})`)).toBe(1);
    expect(await out(page, `db.getCollection('${dotted}').drop()`)).toMatchObject({ ok: 1 });
    expect(await out(page, "show collections")).not.toContain(dotted);
    expect(await out(page, "db")).toBe(db);
  });

  test("find: project, hint, maxTimeMS, toArray and estimatedDocumentCount", async ({ page }) => {
    await out(page, `use ${db}`);
    await out(page, `${ref()}.insertMany([{a: 1, b: 'x'}, {a: 2, b: 'y'}, {a: 3, b: 'z'}])`);
    await out(page, `${ref()}.createIndex({a: 1}, {name: 'a_1'})`);

    expect(await out(page, `${ref()}.find({}).project({a: 1, _id: 0}).sort({a: 1}).toArray()`)).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect((await out(page, `${ref()}.find({a: {$gt: 1}}).hint('a_1').maxTimeMS(5000)`)).length).toBe(2);
    expect((await out(page, `${ref()}.find({a: {$gt: 1}}).hint({a: 1})`)).length).toBe(2);
    expect(await out(page, `${ref()}.estimatedDocumentCount()`)).toBe(3);
  });

  test("updates: upsert, arrayFilters, findOneAnd* and bulkWrite", async ({ page }) => {
    await out(page, `use ${db}`);
    const up = await out(page, `${ref()}.updateOne({k: 'new'}, {$set: {v: 1}}, {upsert: true})`);
    expect(up.upsertedId).toBeTruthy();
    expect(await out(page, `${ref()}.countDocuments({k: 'new'})`)).toBe(1);

    await out(page, `${ref()}.insertOne({k: 'arr', grades: [{g: 80}, {g: 95}]})`);
    await out(page, `${ref()}.updateOne({k: 'arr'}, {$set: {'grades.$[hi].passed': true}}, {arrayFilters: [{'hi.g': {$gte: 90}}]})`);
    const [arr] = await out(page, `${ref()}.find({k: 'arr'})`);
    expect(arr.grades).toEqual([{ g: 80 }, { g: 95, passed: true }]);

    const before = await out(page, `${ref()}.findOneAndUpdate({k: 'new'}, {$inc: {v: 5}})`);
    expect(before.v).toBe(1);
    const after = await out(page, `${ref()}.findOneAndUpdate({k: 'new'}, {$inc: {v: 5}}, {returnDocument: 'after'})`);
    expect(after.v).toBe(11);
    expect(await out(page, `${ref()}.findOneAndUpdate({k: 'missing'}, {$set: {v: 1}})`)).toBeNull();

    const replaced = await out(page, `${ref()}.findOneAndReplace({k: 'new'}, {k: 'new', v: 100}, {returnDocument: 'after'})`);
    expect(replaced.v).toBe(100);

    const bulk = await out(
      page,
      `${ref()}.bulkWrite([{insertOne: {document: {k: 'b1'}}}, {insertOne: {document: {k: 'b2'}}}, {updateOne: {filter: {k: 'b1'}, update: {$set: {z: 1}}}}, {deleteOne: {filter: {k: 'b2'}}}])`,
    );
    expect(bulk).toMatchObject({ insertedCount: 2, modifiedCount: 1, deletedCount: 1 });

    expect(await out(page, `${ref()}.findOneAndDelete({k: 'b1'})`)).toMatchObject({ k: "b1", z: 1 });
    expect(await out(page, `${ref()}.countDocuments({k: 'b1'})`)).toBe(0);
  });

  test("indexes: options, dropIndex by name and keys, dropIndexes; _id cannot go", async ({ page }) => {
    await out(page, `use ${db}`);
    await out(page, `${ref()}.insertOne({email: 'a@b.c', at: new Date()})`);
    await out(page, `${ref()}.createIndex({email: 1}, {unique: true, name: 'email_uq', sparse: true})`);
    await out(page, `${ref()}.createIndex({at: 1}, {expireAfterSeconds: 3600, name: 'at_ttl'})`);
    await out(page, `${ref()}.createIndex({email: 1, at: -1}, {partialFilterExpression: {email: {$exists: true}}})`);

    const indexes = (await out(page, `${ref()}.getIndexes()`)) as { name: string; unique?: boolean; sparse?: boolean; expireAfterSeconds?: number; partialFilterExpression?: unknown }[];
    const byName = Object.fromEntries(indexes.map((i) => [i.name, i]));
    expect(byName.email_uq).toMatchObject({ unique: true, sparse: true });
    expect(byName.at_ttl.expireAfterSeconds).toBe(3600);
    expect(indexes.some((i) => i.partialFilterExpression)).toBe(true);

    expect((await run(page, `${ref()}.createIndex({x: 1}, {mystery: true})`)).status()).toBeGreaterThanOrEqual(400);
    expect((await run(page, `${ref()}.dropIndex('email_uq')`, false)).status()).toBe(403);

    await out(page, `${ref()}.dropIndex('email_uq')`);
    await out(page, `${ref()}.dropIndex({at: 1})`);
    expect(((await out(page, `${ref()}.getIndexes()`)) as { name: string }[]).map((i) => i.name).sort()).toEqual(["_id_", "email_1_at_-1"]);
    expect((await run(page, `${ref()}.dropIndex('_id_')`)).status()).toBeGreaterThanOrEqual(400);

    await out(page, `${ref()}.dropIndexes()`);
    expect(((await out(page, `${ref()}.getIndexes()`)) as unknown[]).length).toBe(1);
  });

  test("server-side code and writes outside the collection stay refused in every spelling", async ({ page }) => {
    for (const bad of [
      `${ref()}.find({$where: 'sleep(1000)'})`,
      `${ref()}.find({"$where": "1"})`,
      `${ref()}.aggregate([{$out: 'copy'}])`,
      `${ref()}.aggregate([{ $merge: { into: 'copy' } }])`,
      `${ref()}.find({a: 1}); eval('1')`,
      `${ref()}.mapReduce()`,
      "db.runCommand({ping: 1})",
      "rm -rf /",
    ]) {
      const res = await run(page, bad);
      expect(res.status(), bad).toBe(403);
    }
  });

  test("describe lists the fields found in the collection", async ({ page }) => {
    await m.add(page, '{"name":"alice","age":{"$numberInt":"30"},"tags":["a"]}');
    await m.add(page, '{"name":"bob","age":"unknown","profile":{"x":1}}');
    const res = await page.request.get(`${apiUrl()}/nosql/describe`, { params: { connectionId: m.s.id, containerId: m.s.container }, headers });
    const spec = (await res.json()).data as { fields: { name: string; types: string[] }[] };
    const fields = Object.fromEntries(spec.fields.map((f) => [f.name, f.types.sort()]));
    expect(fields.name).toEqual(["string"]);
    expect(fields.age).toEqual(["int", "string"]);
    expect(fields.tags).toEqual(["array"]);
    expect(fields.profile).toEqual(["object"]);
    expect(fields._id).toEqual(["objectId"]);
  });
});

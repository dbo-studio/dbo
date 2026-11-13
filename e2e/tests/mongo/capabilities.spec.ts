// @cap: Insert Edit Delete @tool: CLI
import { expect, test } from "@playwright/test";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { useMongo } from "./_case";

/** What the Mongo driver advertises, what it must refuse (no TTL, rename, window, Pub/Sub) and the tree. */
test.describe("MongoDB capabilities", () => {
  const m = useMongo("cap");

  test("describe advertises its capabilities and the CLI and server tools", async ({ page }) => {
    await m.add(page, '{"a":1}');
    const res = await page.request.get(`${apiUrl()}/nosql/describe`, { params: { connectionId: m.s.id, containerId: m.s.container }, headers });
    const spec = await j(res);
    expect(spec.filter).toBe("query");
    expect(spec.listStyle).toBe("flat");
    for (const cap of ["insert", "edit", "delete", "bulk-delete", "bulk-delete-pattern", "recycle", "stats", "doc-tree", "indexes", "aggregate", "schema", "transfer", "collection-admin"]) expect(spec.capabilities, cap).toContain(cap);
    for (const cap of ["ttl", "rename", "window"]) expect(spec.capabilities, cap).not.toContain(cap);
    expect(spec.tools).toEqual(["cli", "server"]);
    expect(spec.createKinds.map((k: { id: string }) => k.id)).toEqual(["document"]);
  });

  test("TTL and rename are not supported and change nothing", async ({ page }) => {
    const id = await m.add(page, '{"a":1}');
    expect((await m.api(page).save(id, { ttlSecs: 60 })).ok()).toBeFalsy();
    expect((await m.api(page).save(id, { newId: "renamed" })).ok()).toBeFalsy();
    expect((await m.api(page).get(id)).ok()).toBeTruthy();
  });

  test("member windows are not supported", async ({ page }) => {
    const id = await m.add(page, '{"a":1}');
    expect((await m.api(page).window(id)).ok()).toBeFalsy();
    expect((await m.api(page).member(id, { op: "set", key: "a", value: "2" })).ok()).toBeFalsy();
  });

  test("Pub/Sub is not supported", async ({ page }) => {
    const ch = await page.request.get(`${apiUrl()}/nosql/tools/pubsub/channels`, { params: { connectionId: m.s.id, pattern: "*" }, headers });
    expect(ch.ok()).toBeFalsy();
    const pub = await page.request.post(`${apiUrl()}/nosql/tools/pubsub/publish`, {
      data: { connectionId: m.s.id, channel: "c", message: "x", confirmed: true },
      headers,
    });
    expect(pub.ok()).toBeFalsy();
  });

  test("the tree lists databases and the collection", async ({ page }) => {
    await m.add(page, '{"a":1}');
    const res = await page.request.get(`${apiUrl()}/tree`, { params: { connectionId: m.s.id }, headers });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect(JSON.stringify(await res.json())).toContain("test");
  });

  test("a container id without a database part is refused", async ({ page }) => {
    const res = await page.request.get(`${apiUrl()}/nosql/browse`, { params: { connectionId: m.s.id, containerId: "onlyonepart" }, headers });
    expect(res.ok()).toBeFalsy();
  });

  test("two collections do not see each other's documents", async ({ page }) => {
    const { nosql } = await import("../../helpers/nosql");
    const other = nosql(page, m.s.id, `test/${m.s.coll}_b`);
    try {
      await m.add(page, '{"who":"a"}');
      await other.insert({ id: "", view: "document", value: '{"who":"b"}', meta: { kind: "document" } });
      const a = (await j(await m.api(page).browse())).items as { value: string }[];
      const b = (await j(await other.browse())).items as { value: string }[];
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(1);
      expect(a[0].value).toContain('"a"');
      expect(b[0].value).toContain('"b"');
    } finally {
      await page.request.post(`${apiUrl()}/nosql/tools/cli/run`, { data: { connectionId: m.s.id, input: `db.${m.s.coll}_b.deleteMany({})`, confirmed: true }, headers });
    }
  });
});

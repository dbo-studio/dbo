import { expect, test } from "@playwright/test";
import { j } from "../../helpers/nosql";
import { KINDS, useRedis } from "../../helpers/redisCase";

/** Redis create / read / edit / delete for every key type, member operations and input validation. */
test.describe("Redis types CRUD", () => {
  const r = useRedis();
  const key = (n: string): string => `${r.s.prefix}:${n}`;
  const item = (id: string, kind: keyof typeof KINDS, value?: unknown) => ({
    id,
    view: KINDS[kind].view,
    value: value ?? KINDS[kind].value,
    meta: { kind },
  });

  for (const kind of Object.keys(KINDS) as (keyof typeof KINDS)[]) {
    test(`${kind}: create, read back, replace, delete`, async ({ page }) => {
      const api = r.api(page);
      const id = key(kind);
      const created = await api.insert(item(id, kind));
      expect(created.ok(), await created.text()).toBeTruthy();

      const got = await j(await api.get(id));
      expect(got.meta.type).toBe(kind);
      if (kind === "set") expect([...got.value].sort()).toEqual(["p", "q"]);
      else if (kind === "zset") {
        expect(got.value).toEqual([
          { member: "m1", score: 1 },
          { member: "m2", score: 2.5 },
        ]);
      } else expect(got.value).toEqual(KINDS[kind].value);

      const next = {
        string: "changed",
        hash: { z: "9" },
        list: ["only"],
        set: ["solo"],
        zset: [{ member: "k", score: 7 }],
      }[kind];
      const saved = await api.save(id, { value: next });
      expect(saved.ok(), await saved.text()).toBeTruthy();
      const after = await j(await api.get(id));
      if (kind === "set") expect(after.value).toEqual(["solo"]);
      else expect(after.value).toEqual(next);

      expect((await api.remove([id])).ok()).toBeTruthy();
      expect((await api.get(id)).ok()).toBeFalsy();
    });
  }

  test("an existing key is never overwritten by create", async ({ page }) => {
    const api = r.api(page);
    await api.insert(item(key("dup"), "string"));
    const again = await api.insert(item(key("dup"), "string", "other"));
    expect(again.status()).toBe(400);
    expect((await j(await api.get(key("dup")))).value).toBe("hello");
  });

  test("create needs a key name", async ({ page }) => {
    const res = await r.api(page).insert(item("", "string"));
    expect(res.status()).toBe(400);
  });

  test("empty collections are refused", async ({ page }) => {
    const api = r.api(page);
    expect((await api.insert(item(key("h"), "hash", {}))).status()).toBe(400);
    expect((await api.insert(item(key("l"), "list", []))).status()).toBe(400);
    expect((await api.insert(item(key("s"), "set", []))).status()).toBe(400);
    expect((await api.insert(item(key("z"), "zset", []))).status()).toBe(400);
  });

  test("a sorted set member needs a numeric score", async ({ page }) => {
    const res = await r.api(page).insert(item(key("zbad"), "zset", [{ member: "m", score: "high" }]));
    expect(res.status()).toBe(400);
  });

  test("a string value must be text", async ({ page }) => {
    const res = await r.api(page).insert(item(key("sbad"), "string", { not: "text" }));
    expect(res.status()).toBe(400);
  });

  test("invalid base64 is refused for a binary string", async ({ page }) => {
    const res = await r.api(page).insert({ id: key("b64"), view: "text", value: "%%%", meta: { kind: "string", encoding: "base64" } });
    expect(res.status()).toBe(400);
  });

  test("unicode, quotes and newlines round-trip", async ({ page }) => {
    const api = r.api(page);
    const value = 'héllo "wörld" \n 日本語 🚀 \\ \t end';
    await api.insert(item(key("uni"), "string", value));
    expect((await j(await api.get(key("uni")))).value).toBe(value);
  });

  test("a key with spaces and a delimiter-heavy name is addressable", async ({ page }) => {
    const api = r.api(page);
    const id = key("a b:c:d/e");
    await api.insert(item(id, "string"));
    expect((await j(await api.get(id))).value).toBe("hello");
  });

  test("an empty string value is allowed", async ({ page }) => {
    const api = r.api(page);
    await api.insert(item(key("empty"), "string", ""));
    expect((await j(await api.get(key("empty")))).value).toBe("");
  });

  test("reading a missing key is a 400, not a crash", async ({ page }) => {
    expect((await r.api(page).get(key("missing"))).status()).toBe(400);
  });

  test("saving a missing key is refused and does not create it", async ({ page }) => {
    const api = r.api(page);
    expect((await api.save(key("ghost"), { value: "x" })).status()).toBe(400);
    expect((await api.get(key("ghost"))).ok()).toBeFalsy();
  });

  test("a string save keeps its TTL", async ({ page }) => {
    const api = r.api(page);
    await api.insert(item(key("ttl"), "string"));
    await api.save(key("ttl"), { ttlSecs: 600 });
    await api.save(key("ttl"), { value: "v2" });
    const got = await j(await api.get(key("ttl")));
    expect(got.value).toBe("v2");
    expect(got.meta.ttl).toBeGreaterThan(500);
  });

  test("a hash save keeps its TTL", async ({ page }) => {
    const api = r.api(page);
    await api.insert(item(key("httl"), "hash"));
    await api.save(key("httl"), { ttlSecs: 600 });
    await api.save(key("httl"), { value: { n: "1" } });
    expect((await j(await api.get(key("httl")))).meta.ttl).toBeGreaterThan(500);
  });

  test("delete removes several keys and ignores keys that do not exist", async ({ page }) => {
    const api = r.api(page);
    await api.insert(item(key("d1"), "string"));
    await api.insert(item(key("d2"), "string"));
    expect((await api.remove([key("d1"), key("d2"), key("never")])).ok()).toBeTruthy();
    expect((await api.get(key("d1"))).ok()).toBeFalsy();
    expect((await api.get(key("d2"))).ok()).toBeFalsy();
  });

  test("delete refuses more than the batch limit", async ({ page }) => {
    const ids = Array.from({ length: 5001 }, (_, i) => `${r.s.prefix}:b${i}`);
    expect((await r.api(page).remove(ids)).status()).toBe(400);
  });

  test("a stream is read-only: save and member edits are refused", async ({ page }) => {
    const api = r.api(page);
    const id = key("stream");
    expect((await api.cli(`XADD ${id} * a 1`, true)).ok()).toBeTruthy();
    const got = await j(await api.get(id));
    expect(got.meta.type).toBe("stream");
    expect(got.meta.readonly).toBe(true);
    expect((await api.save(id, { value: ["x"] })).status()).toBe(400);
  });

  test.describe("member operations", () => {
    test("hash: set and remove one field", async ({ page }) => {
      const api = r.api(page);
      await api.insert(item(key("hm"), "hash"));
      expect((await api.member(key("hm"), { op: "set", key: "c", value: "3" })).ok()).toBeTruthy();
      expect((await api.member(key("hm"), { op: "remove", key: "a" })).ok()).toBeTruthy();
      expect((await j(await api.get(key("hm")))).value).toEqual({ b: "2", c: "3" });
    });

    test("set: add and remove a member", async ({ page }) => {
      const api = r.api(page);
      await api.insert(item(key("sm"), "set"));
      await api.member(key("sm"), { op: "set", key: "r" });
      await api.member(key("sm"), { op: "remove", key: "p" });
      expect([...(await j(await api.get(key("sm")))).value].sort()).toEqual(["q", "r"]);
    });

    test("zset: set a score, add a member, remove a member; a score is required", async ({ page }) => {
      const api = r.api(page);
      await api.insert(item(key("zm"), "zset"));
      expect((await api.member(key("zm"), { op: "set", key: "m1", score: 10 })).ok()).toBeTruthy();
      expect((await api.member(key("zm"), { op: "set", key: "m3", score: 0.5 })).ok()).toBeTruthy();
      expect((await api.member(key("zm"), { op: "remove", key: "m2" })).ok()).toBeTruthy();
      expect((await api.member(key("zm"), { op: "set", key: "m9" })).ok()).toBeFalsy();
      expect((await j(await api.get(key("zm")))).value).toEqual([
        { member: "m3", score: 0.5 },
        { member: "m1", score: 10 },
      ]);
    });

    test("list: append, set by index; a bad or out-of-range index is refused", async ({ page }) => {
      const api = r.api(page);
      await api.insert(item(key("lm"), "list"));
      expect((await api.member(key("lm"), { op: "append", value: "w" })).ok()).toBeTruthy();
      expect((await api.member(key("lm"), { op: "set", key: "0", value: "X" })).ok()).toBeTruthy();
      expect((await api.member(key("lm"), { op: "set", key: "abc", value: "?" })).ok()).toBeFalsy();
      expect((await api.member(key("lm"), { op: "set", key: "99", value: "?" })).ok()).toBeFalsy();
      expect((await j(await api.get(key("lm")))).value).toEqual(["X", "y", "z", "w"]);
    });

    test("an operation that does not fit the type is refused", async ({ page }) => {
      const api = r.api(page);
      await api.insert(item(key("sx"), "string"));
      expect((await api.member(key("sx"), { op: "set", key: "k", value: "v" })).ok()).toBeFalsy();
      await api.insert(item(key("hx"), "hash"));
      expect((await api.member(key("hx"), { op: "append", value: "v" })).ok()).toBeFalsy();
    });
  });

  test.describe("browse", () => {
    test("pattern filter returns only matching keys and reports their type", async ({ page }) => {
      const api = r.api(page);
      for (const k of ["string", "hash", "list", "set", "zset"] as const) await api.insert(item(key(`b-${k}`), k));
      await api.insert(item(`${r.s.prefix}-other`, "string"));
      const page1 = await j(await api.browse({ filter: `${r.s.prefix}:b-*`, limit: 50 }));
      expect(page1.items.map((i: { id: string }) => i.id).sort()).toEqual(
        ["string", "hash", "list", "set", "zset"].map((k) => key(`b-${k}`)).sort(),
      );
    });

    test("a limit pages through all keys with the cursor and never repeats one", async ({ page }) => {
      const api = r.api(page);
      for (let i = 0; i < 25; i++) await api.insert(item(key(`p${i}`), "string"));
      const seen = new Set<string>();
      let cursor = "";
      for (let guard = 0; guard < 50; guard++) {
        const res = await j(await api.browse({ filter: `${r.s.prefix}:p*`, limit: 10, cursor }));
        for (const it of res.items as { id: string }[]) {
          expect(seen.has(it.id)).toBe(false);
          seen.add(it.id);
        }
        cursor = res.nextCursor;
        if (!cursor) break;
      }
      expect(seen.size).toBe(25);
    });

    test("a pattern that matches nothing returns an empty page", async ({ page }) => {
      const res = await j(await r.api(page).browse({ filter: `${r.s.prefix}:nothing-*` }));
      expect(res.items).toEqual([]);
    });
  });
});

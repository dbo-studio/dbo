import { expect, test } from "@playwright/test";
import { j } from "../../helpers/nosql";
import { useRedis } from "../../helpers/redisCase";

/** Redis Safe Mode: every CLI command is classified read / write / destructive / blocked. */
test.describe("Redis safe mode classification", () => {
  const r = useRedis();

  const blocked = [
    "KEYS *", "DEBUG SLEEP 0", "SHUTDOWN", "MODULE LIST", "SCRIPT FLUSH", "EVAL 'return 1' 0", "FUNCTION LIST",
    "MONITOR", "SUBSCRIBE c", "REPLICAOF NO ONE", "CLUSTER INFO", "SAVE", "BGSAVE", "BLPOP q 1", "XREAD STREAMS s 0",
    "WAIT 1 1", "CLIENT LIST", "ACL LIST", "CONFIG SET maxmemory 0", "CONFIG REWRITE",
  ];
  for (const cmd of blocked) {
    test(`blocked: ${cmd}`, async ({ page }) => {
      const res = await r.api(page).cli(cmd, true);
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe("safe_mode_blocked");
    });
  }

  for (const cmd of ["FLUSHDB", "FLUSHALL", "DEL e2e:none", "UNLINK e2e:none", "RENAME e2e:a e2e:b"]) {
    test(`destructive needs confirmation: ${cmd}`, async ({ page }) => {
      const res = await r.api(page).cli(cmd, false);
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe("safe_mode_confirm_required");
    });
  }

  test("reads run without confirmation", async ({ page }) => {
    const api = r.api(page);
    for (const cmd of ["PING", "DBSIZE", "CONFIG GET maxmemory", `GET ${r.s.prefix}:none`, `TTL ${r.s.prefix}:none`, `EXISTS ${r.s.prefix}:none`]) {
      const res = await api.cli(cmd, false);
      expect(res.ok(), `${cmd}: ${await res.text()}`).toBeTruthy();
    }
  });

  test("a write runs and the value is visible through the item API", async ({ page }) => {
    const api = r.api(page);
    const key = `${r.s.prefix}:cli`;
    const set = await api.cli(`SET ${key} "hello world"`, true);
    expect(set.ok(), await set.text()).toBeTruthy();
    expect((await j(await api.get(key))).value).toBe("hello world");
  });

  test("a destructive command runs once confirmed", async ({ page }) => {
    const api = r.api(page);
    const key = `${r.s.prefix}:del`;
    await api.cli(`SET ${key} v`, true);
    expect((await api.cli(`DEL ${key}`, true)).ok()).toBeTruthy();
    expect((await api.get(key)).ok()).toBeFalsy();
  });

  test("an unparsable command line is refused", async ({ page }) => {
    const res = await r.api(page).cli('GET "unterminated', true);
    expect(res.ok()).toBeFalsy();
  });

  test("an empty command is refused", async ({ page }) => {
    const res = await r.api(page).cli("   ", true);
    expect(res.ok()).toBeFalsy();
  });
});

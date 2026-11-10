import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Chat panel: remembered width, Comfortable / Compact density, per-turn timestamp. */

async function openAssistant(page: Page): Promise<void> {
  const settingsPage = new SettingsPage(page);
  // The sidebar state is persisted; give a reloaded page a moment before toggling it open.
  const alreadyOpen = await settingsPage
    .rightSidebarTab()
    .waitFor({ timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!alreadyOpen) {
    await settingsPage.toggleRightSidebar();
  }
  await expect(settingsPage.rightSidebarTab()).toBeVisible({ timeout: 15000 });
}

const panelWidth = (page: Page): Promise<number> =>
  page
    .getByTestId("resize-handle")
    .last()
    .evaluate((handle) => handle.parentElement?.getBoundingClientRect().width ?? 0);

test.describe("AI chat panel refresh", () => {
  test("remembers width, switches density, shows message time", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-refresh-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-refresh-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const settingsPage = new SettingsPage(page);

      await page.route("**/api/ai/chat/stream", async (route) => {
        const events = [
          { type: "block_start", blockType: "explanation" },
          { type: "content_delta", content: "Hello back." },
          { type: "block_end" },
          {
            type: "done",
            chatId: 0,
            title: "refresh e2e",
            messages: [
              {
                role: "assistant",
                type: "explanation",
                language: "text",
                content: "Hello back.",
                createdAt: "2026-01-02 03:04:05",
              },
            ],
          },
        ];
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: events.map((event) => JSON.stringify(event)).join("\n") + "\n",
        });
      });

      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      await openAssistant(page);
      await page.getByTestId("ai-empty-quick-setup").click();
      await expect(settingsPage.aiSetupForm()).toBeVisible({ timeout: 15000 });
      await saveAiSetup(page, "sk-e2e-fake-key");

      const composer = page.getByPlaceholder(/ask anything/i);
      await composer.fill("hello");
      await composer.press("Enter");
      await expect(page.getByText("Hello back.")).toBeVisible({ timeout: 15000 });

      await test.step("Message shows its time on hover", async () => {
        const title = await page.getByTestId("ai-message").last().getAttribute("title");
        expect(title).toBeTruthy();
        expect(title).toContain("2026");
      });

      await test.step("Density toggles spacing and persists", async () => {
        const toggle = page.getByTestId("ai-density-toggle");
        const gap = (): Promise<string> =>
          page
            .getByTestId("ai-message")
            .first()
            .evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).rowGap);

        await expect(toggle).toHaveAttribute("data-density", "comfortable");
        const comfortable = parseFloat(await gap());

        await toggle.click();
        await expect(toggle).toHaveAttribute("data-density", "compact");
        expect(parseFloat(await gap())).toBeLessThan(comfortable);

        await page.reload();
        await openAssistant(page);
        await expect(page.getByTestId("ai-density-toggle")).toHaveAttribute("data-density", "compact");
      });

      await test.step("Panel width is remembered after a resize", async () => {
        const before = await panelWidth(page);
        const handle = page.getByTestId("resize-handle").last();
        const box = await handle.boundingBox();
        expect(box).not.toBeNull();

        await page.mouse.move((box?.x ?? 0) + 2, (box?.y ?? 0) + 40);
        await page.mouse.down();
        await page.mouse.move((box?.x ?? 0) - 120, (box?.y ?? 0) + 40, { steps: 6 });
        await page.mouse.up();

        const resized = await panelWidth(page);
        expect(resized).toBeGreaterThan(before + 60);

        await page.reload();
        await openAssistant(page);
        expect(Math.abs((await panelWidth(page)) - resized)).toBeLessThan(4);
      });

      await test.step("Jump to latest appears when scrolled up and returns to the end", async () => {
        const jump = page.getByTestId("ai-jump-to-latest");
        const composerAfterReload = page.getByPlaceholder(/ask anything/i);
        await expect(jump).toHaveCount(0);

        for (let turn = 0; turn < 14; turn += 1) {
          await composerAfterReload.fill(`turn ${turn}`);
          await composerAfterReload.press("Enter");
          await expect(page.getByTestId("ai-chat-cancel")).toHaveCount(0, { timeout: 15000 });
        }

        // A real scroll: a programmatic one is not the user leaving the bottom.
        const conversation = await page.locator("[data-density]:not([data-testid])").boundingBox();
        await page.mouse.move(
          (conversation?.x ?? 0) + (conversation?.width ?? 0) / 2,
          (conversation?.y ?? 0) + (conversation?.height ?? 0) / 2,
        );
        await page.mouse.wheel(0, -20000);
        await expect(jump).toBeVisible();

        await jump.click();
        await expect(jump).toHaveCount(0);
      });
    });
  });
});

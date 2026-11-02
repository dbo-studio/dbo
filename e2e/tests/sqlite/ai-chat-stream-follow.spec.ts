import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** The conversation follows a streaming answer, and sending always brings it back to the bottom. */

const section = (n: number): string => `## Section ${n}

A paragraph for section ${n} with **bold** text and \`inline code\`.

- first finding
- second finding
- third finding

`;

const answer = (from: number, count: number): string =>
  Array.from({ length: count }, (_, i) => section(from + i)).join("");

async function distanceFromBottom(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector("[data-density]") as HTMLElement;
    return Math.round(el.scrollHeight - el.scrollTop - el.clientHeight);
  });
}

/** Puts the pointer over the conversation so a wheel scroll reaches it (hover() would scroll programmatically). */
async function hoverConversation(page: Page): Promise<void> {
  const box = await page.locator("[data-density]").boundingBox();
  await page.mouse.move(
    (box?.x ?? 0) + (box?.width ?? 0) / 2,
    (box?.y ?? 0) + (box?.height ?? 0) / 2,
  );
}

test.describe("AI chat streaming follow", () => {
  test("follows the answer and returns to the bottom when you send", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-follow-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-follow-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const composer = page.getByTestId("ai-chat-input");
        const message = (text: string) =>
          page.getByTestId("ai-message").filter({ hasText: text });

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 15000,
        });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.getByTestId("ai-expand-to-agent").click();

        await test.step("A long streaming answer stays in view", async () => {
          llm.reply = { text: answer(1, 8), wordDelayMs: 10 };
          await composer.fill("long answer");
          await composer.press("Enter");

          await expect(message("Section 3")).toHaveCount(1, { timeout: 30000 });
          expect(await distanceFromBottom(page)).toBeLessThan(120);

          await expect(message("Section 8")).toHaveCount(1, { timeout: 60000 });
          await expect.poll(() => distanceFromBottom(page)).toBeLessThan(120);
        });

        await test.step("Lists are not double spaced", async () => {
          const items = message("Section 8").locator("li");
          await expect(items).toHaveCount(24);
          const boxes = await items.evaluateAll((nodes) =>
            nodes.slice(-3).map((node) => node.getBoundingClientRect()),
          );
          // Consecutive items sit about one line apart, not a blank line apart.
          expect(boxes[1].top - boxes[0].top).toBeLessThan(boxes[0].height * 2);
        });

        await test.step("A thinking indicator shows at once, before the first word", async () => {
          llm.reply = {
            text: answer(60, 2),
            wordDelayMs: 10,
            startDelayMs: 2500,
          };
          await composer.fill("slow start");
          await composer.press("Enter");

          await expect(page.getByTestId("ai-thinking")).toBeVisible({
            timeout: 800,
          });
          await expect(message("Section 60")).toHaveCount(1, {
            timeout: 30000,
          });
          await expect(page.getByTestId("ai-thinking")).toHaveCount(0);
        });

        await test.step("The paragraph being typed is formatted and carries the caret", async () => {
          llm.reply = { text: answer(70, 3), wordDelayMs: 120 };
          await composer.fill("slow words");
          await composer.press("Enter");

          await expect
            .poll(
              () =>
                page.evaluate(() =>
                  [
                    ...document.querySelectorAll(
                      "[data-density] p, [data-density] li",
                    ),
                  ].some(
                    (el) =>
                      getComputedStyle(el, "::after").content !== "none" &&
                      getComputedStyle(el, "::after").content !== "normal",
                  ),
                ),
              { timeout: 20000 },
            )
            .toBe(true);
          await expect(message("Section 72")).toHaveCount(1, {
            timeout: 60000,
          });
        });

        await test.step("Sending brings the conversation back to the bottom after scrolling up", async () => {
          await hoverConversation(page);
          await page.mouse.wheel(0, -5000);
          await expect(page.getByTestId("ai-jump-to-latest")).toBeVisible();

          llm.reply = { text: answer(20, 6), wordDelayMs: 10 };
          await composer.fill("another one");
          await composer.press("Enter");

          await expect(message("Section 22")).toHaveCount(1, {
            timeout: 30000,
          });
          expect(await distanceFromBottom(page)).toBeLessThan(120);
        });

        await test.step("Scrolling up while streaming stops the follow, Jump to latest resumes it", async () => {
          llm.reply = { text: answer(40, 8), wordDelayMs: 25 };
          await composer.fill("one more");
          await composer.press("Enter");
          await expect(message("Section 41")).toHaveCount(1, {
            timeout: 30000,
          });

          await hoverConversation(page);
          await page.mouse.wheel(0, -900);
          await expect(page.getByTestId("ai-jump-to-latest")).toBeVisible();
          const held = await distanceFromBottom(page);
          await page.waitForTimeout(600);
          // Still reading older text: the view did not get pulled down.
          expect(await distanceFromBottom(page)).toBeGreaterThanOrEqual(held);

          await page.getByTestId("ai-jump-to-latest").click();
          await expect(message("Section 47")).toHaveCount(1, {
            timeout: 60000,
          });
          await expect.poll(() => distanceFromBottom(page)).toBeLessThan(120);
        });

        await test.step("A markdown table between paragraphs keeps every row inside the table", async () => {
          llm.reply = {
            text: "Rows by country:\n\n| country | customers |\n|---|---|\n| CN | 1 |\n| US | 2 |\n\nThat is all.",
            wordDelayMs: 5,
          };
          await composer.fill("rows by country");
          await composer.press("Enter");
          const reply = message("That is all.");
          await expect(reply).toHaveCount(1, { timeout: 20000 });
          await expect(reply.getByTestId("ai-table-row-count")).toContainText("2");
          // The last row once leaked out of the table as plain text.
          await expect(reply.getByText("| US | 2 |")).toHaveCount(0);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});

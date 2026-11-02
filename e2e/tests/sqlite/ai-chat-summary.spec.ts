import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/** A long chat keeps a running summary, so a decision from its start still reaches the model near its end. */
test.describe("AI long chat summary", () => {
  test("a decision from message 3 is still in the prompt at message 30", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-summary-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-summary-${suffix}.db`;
    ensureSqliteDbFile(dbPath);
    const llm = new FakeLlm();
    const llmUrl = await llm.start();
    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await pointProviderAtFakeLlm(page, llmUrl);
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        const created = await page.request.post("/api/ai/chats", {
          data: { connectionId, title: "long chat" },
        });
        const chatId = ((await created.json()) as { data: { id: number } }).data
          .id;
        const say = async (message: string): Promise<string> => {
          const sent = await page.request.post("/api/ai/chat/stream", {
            data: { connectionId, chatId, message, mode: "ask" },
          });
          expect(sent.status()).toBe(200);
          await sent.text();
          return llm.systemPrompts.at(-1) ?? "";
        };

        // Each turn stores two messages, so turn 2 holds message 3 and turn 15 holds message 30.
        await say("Let's design an orders table.");
        await say("Decision: every primary key is a UUID named uid.");
        let prompt = "";
        for (let turn = 3; turn <= 15; turn++)
          prompt = await say(`Question number ${turn} about indexes.`);

        expect(llm.summaryRequests).toBeGreaterThan(0);
        expect(prompt).toContain("Earlier in this chat");
        expect(prompt).toContain("every primary key is a UUID named uid");

        const before = llm.summaryRequests;
        for (let turn = 16; turn <= 22; turn++)
          prompt = await say(`Follow-up ${turn} on naming.`);
        // The summary refreshes as the chat grows: newer turns are folded in, and the decision stays.
        expect(llm.summaryRequests).toBeGreaterThan(before);
        expect(prompt).toContain("Question number 5 about indexes");
        expect(prompt).toContain("every primary key is a UUID named uid");
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});

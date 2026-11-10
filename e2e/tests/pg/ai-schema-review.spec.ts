import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { checkSchemaReview, reviewFixture } from "../../helpers/schemaReview";
import { ConnectionPage } from "../../pages";

test.describe("AI schema review (postgresql)", () => {
  test("finds the fixture's problems and applies a fix", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo)
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    const connectionName = `ai-review-${suffix}`;
    const schema = `review_${suffix}`;
    const llm = new FakeLlm();
    const llmUrl = await llm.start();
    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("postgresql", connectionName),
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
        const raw = async (query: string): Promise<void> => {
          const response = await page.request.post("/api/query/raw", {
            data: { connectionId, query },
          });
          expect(response.status(), query).toBe(200);
        };

        await raw(`CREATE SCHEMA ${schema}`);
        try {
          for (const sql of reviewFixture(`${schema}.`)) await raw(sql);
          await checkSchemaReview(page, llm, connectionId, {
            database: "default",
            schema,
          });
        } finally {
          await raw(`DROP SCHEMA ${schema} CASCADE`);
        }
      });
    } finally {
      await llm.stop();
    }
  });
});

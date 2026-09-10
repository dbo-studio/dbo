import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { setupImportExport, dropTables } from "../../helpers/importExport";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("Export SavePath validation", () => {
  test("rejects traversal and absolute savePath on web export API", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `export-savepath-${suffix}`;
    const exportTable = `e2e_savepath_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const pages = await setupImportExport(
        page,
        { connectionName, exportTable },
        "postgresql",
      );

      const listResponse = await page.request.get("/api/connections");
      const listBody = (await listResponse.json()) as {
        data: Array<{ id: number; name: string }>;
      };
      const connection = listBody.data.find(
        (item) => item.name === connectionName,
      );
      expect(connection).toBeDefined();

      const basePayload = {
        connectionId: connection?.id,
        table: exportTable,
        query: `SELECT * FROM ${exportTable}`,
        format: "csv" as const,
      };

      await test.step("Reject parent-segment savePath", async () => {
        const response = await page.request.post("/api/export", {
          data: { ...basePayload, savePath: "../escape.csv" },
        });
        expect(response.status()).toBe(400);

        const body = (await response.json()) as { message?: string };
        expect(body.message).toContain("invalid save path");
      });

      await test.step("Reject absolute savePath", async () => {
        const response = await page.request.post("/api/export", {
          data: { ...basePayload, savePath: "/tmp/escape.csv" },
        });
        expect(response.status()).toBe(400);

        const body = (await response.json()) as { message?: string };
        expect(body.message).toContain("invalid save path");
      });

      await dropTables(pages.sqlEditor, [exportTable]);
    });
  });
});

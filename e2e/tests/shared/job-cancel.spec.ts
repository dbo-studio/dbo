import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { setupImportExport, dropTables } from "../../helpers/importExport";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

async function waitForJobStatus(
  page: import("@playwright/test").Page,
  jobId: number,
  status: string,
  timeoutMs = 60_000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "";

  while (Date.now() < deadline) {
    const response = await page.request.get(`/api/jobs/${jobId}`);
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      data?: { status?: string; error?: string };
    };
    lastStatus = body.data?.status ?? "";
    if (lastStatus === status) {
      return body.data as Record<string, unknown>;
    }

    await page.waitForTimeout(500);
  }

  throw new Error(
    `job ${jobId} did not reach status ${status} (last: ${lastStatus || "unknown"})`,
  );
}

test.describe("Job cancel and failure visibility", () => {
  test("cancelled export stays cancelled; failed export surfaces error", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `job-cancel-${suffix}`;
    const exportTable = `e2e_job_cancel_${suffix}`;

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

      await test.step("Cancel a running export job", async () => {
        const startResponse = await page.request.post("/api/export", {
          data: {
            connectionId: connection?.id,
            table: exportTable,
            query: `SELECT pg_sleep(2), * FROM ${exportTable}`,
            format: "csv",
          },
        });
        expect(startResponse.ok()).toBeTruthy();

        const startBody = (await startResponse.json()) as {
          data?: { jobId?: number };
        };
        const jobId = startBody.data?.jobId;
        expect(jobId).toBeGreaterThan(0);

        const cancelResponse = await page.request.delete(`/api/jobs/${jobId}`);
        expect(cancelResponse.ok()).toBeTruthy();

        const detail = await waitForJobStatus(page, jobId!, "canceled");
        expect(detail.status).toBe("canceled");
      });

      await test.step("Failed export exposes error message", async () => {
        const startResponse = await page.request.post("/api/export", {
          data: {
            connectionId: connection?.id,
            table: exportTable,
            query: "SELECT * FROM dbo_missing_table_for_e2e",
            format: "csv",
          },
        });
        expect(startResponse.ok()).toBeTruthy();

        const startBody = (await startResponse.json()) as {
          data?: { jobId?: number };
        };
        const jobId = startBody.data?.jobId;
        expect(jobId).toBeGreaterThan(0);

        const detail = await waitForJobStatus(page, jobId!, "failed", 90_000);
        expect(detail.status).toBe("failed");
        expect(String(detail.error ?? "")).not.toBe("");
      });

      await dropTables(pages.sqlEditor, [exportTable]);
    });
  });
});

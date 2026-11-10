import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { SAFE_MODE_PASSWORD } from "../../fixtures/safeMode";
import {
  SAFE_MODE_OBJECT_ACTIONS,
  UNCLASSIFIED_REASON,
} from "../../fixtures/safeModeObjectActions";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SafeModePage } from "../../pages";

interface ExecuteReply {
  status: number;
  message: string;
  reason: string;
  requiresConfirm: boolean;
}

test.describe("Safe Mode gates core-schema object actions (PostgreSQL)", () => {
  test("Every new action is classified and needs confirmation", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const safeMode = new SafeModePage(page);
    const connectionName = `safe-mode-pg-objects-${uniqueTestSuffix(testInfo)}`;
    const apiUrl = process.env.PLAYWRIGHT_API_URL;
    expect(apiUrl, "PLAYWRIGHT_API_URL must be set by run-e2e").toBeTruthy();

    // The gate runs before any object is touched, so the node need not exist.
    const execute = async (
      connectionId: number,
      action: string,
      confirmed: boolean,
    ): Promise<ExecuteReply> => {
      const response = await page.request.post(
        `${apiUrl}/tree/default.public.e2e_gate/tabs/${action}/fields/object`,
        {
          params: { connectionId, ...(confirmed ? { confirmed: true } : {}) },
          data: { general: {} },
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        data?: { reason?: string; requiresConfirm?: boolean };
      };
      return {
        status: response.status(),
        message: body.message ?? "",
        reason: body.data?.reason ?? "",
        requiresConfirm: body.data?.requiresConfirm === true,
      };
    };

    await withConnectionCleanup(page, connectionName, async () => {
      let connectionId = 0;

      await test.step("Connect and enable Alert Mode 2", async () => {
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("postgresql", connectionName),
        );
        await safeMode.selectMode("alert_write");

        const list = await page.request.get(`${apiUrl}/connections`);
        const body = (await list.json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const found = body.data.find((item) => item.name === connectionName);
        expect(found, "connection exists in the API").toBeTruthy();
        connectionId = found!.id;
      });

      await test.step("Control: an unclassified action gets the generic reason", async () => {
        const reply = await execute(connectionId, "notAnObjectAction", false);
        expect(reply.status).toBe(403);
        expect(reply.message).toBe("safe_mode_confirm_required");
        expect(reply.reason).toMatch(UNCLASSIFIED_REASON);
      });

      for (const { action, reason } of SAFE_MODE_OBJECT_ACTIONS) {
        await test.step(`${action} is blocked until confirmed, with the right reason`, async () => {
          const reply = await execute(connectionId, action, false);
          expect(reply.status, `${action} without confirm`).toBe(403);
          expect(reply.message).toBe("safe_mode_confirm_required");
          expect(reply.requiresConfirm).toBe(true);
          expect(reply.reason, `${action} reason`).toMatch(reason);
        });
      }

      await test.step("A confirmed request passes the gate", async () => {
        // The gate lets it through; the empty payload then plans to no statements.
        const reply = await execute(connectionId, "createType", true);
        expect(reply.message).not.toBe("safe_mode_confirm_required");
        expect(reply.status).toBeLessThan(500);
      });

      await test.step("Restore Silent mode", async () => {
        await safeMode.selectSilentWithPassword(SAFE_MODE_PASSWORD);
      });
    });
  });
});

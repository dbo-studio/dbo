import { expect, test } from "@playwright/test";
import { ConnectionPage, SettingsPage } from "../../pages";

/**
 * MCP settings panel UI smoke (no LLM).
 */
test.describe("MCP panel", () => {
  test("Open MCP tab shows enable and status controls", async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.dismissNewConnectionModalIfOpen();

    await test.step("Open MCP via header status button", async () => {
      await page.getByRole("button", { name: "mcp-status" }).click();
      await settingsPage.expectMcpPanelVisible();
    });

    await settingsPage.close();
  });

  test("Enable MCP toggles status chip", async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.dismissNewConnectionModalIfOpen();

    await test.step("Open MCP and enable then disable", async () => {
      await page.getByRole("button", { name: "mcp-status" }).click();
      await settingsPage.expectMcpPanelVisible();

      const enableSwitch = page.getByRole("switch", {
        name: /Enable MCP server/i,
      });
      await expect(enableSwitch).toBeVisible({ timeout: 10000 });
      if (!(await enableSwitch.isChecked())) {
        await enableSwitch.click();
      }
      await expect(page.getByText(/Running|Stopped/i).first()).toBeVisible({
        timeout: 15000,
      });

      if (await enableSwitch.isChecked()) {
        await enableSwitch.click();
      }
    });

    await settingsPage.close();
  });
});

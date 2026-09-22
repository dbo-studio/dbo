import { expect, type Page } from "@playwright/test";
import { apiRoute, waitForResponseDuring } from "./network";

export function aiSetupForm(page: Page) {
  return page.getByTestId("ai-setup-form");
}

/** Shared ephemeral app DB — deactivate any profile left by a prior spec. */
export async function clearActiveAiProfile(page: Page): Promise<void> {
  const response = await page.request.get("/api/ai/providers");
  const body = (await response.json()) as {
    data?: Array<{ id: number; isActive: boolean }>;
  };

  for (const item of body.data ?? []) {
    if (!item.isActive) {
      continue;
    }
    await page.request.patch(`/api/ai/providers/${item.id}`, {
      data: { isActive: false },
    });
  }
}

export async function saveAiSetup(page: Page, apiKey: string): Promise<void> {
  const form = aiSetupForm(page);
  await expect(form).toBeVisible({ timeout: 10000 });
  const apiKeyField = form.getByTestId("ai-setup-api-key");
  if ((await apiKeyField.count()) > 0) {
    await apiKeyField.fill(apiKey);
  }
  await waitForResponseDuring(
    page,
    apiRoute.aiProvidersUpdate,
    async () => {
      await form.getByTestId("ai-setup-save").click();
    },
  );
}

import type { Page } from "@playwright/test";

/** Desktop header control; absent when `useCompactHeader` (tablet / overflow menu). */
export function headerSqlEditorButton(page: Page) {
  return page.getByRole("button", { name: "sql", exact: true });
}

export async function openSqlEditorFromHeader(page: Page): Promise<void> {
  if (page.isClosed()) {
    return;
  }
  const queryTabs = page.getByTestId("workspace-tab-icon-query");
  if ((await queryTabs.count()) > 0) {
    await queryTabs.first().click();
    return;
  }
  const sql = headerSqlEditorButton(page);
  if ((await sql.count()) > 0) {
    await sql.click();
    return;
  }
  await page.getByRole("button", { name: "header-menu" }).click();
  await page.getByRole("menuitem", { name: /open editor/i }).click();
}
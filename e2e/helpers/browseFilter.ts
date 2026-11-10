import { expect, type Page } from "@playwright/test";

type MonacoEditor = { setValue: (v: string) => void; getValue: () => string; getContainerDomNode?: () => HTMLElement };

/** Sets the Browse tab's Monaco filter bar through the Monaco API (typing races with suggestions) and applies it. */
export async function applyBrowseFilter(page: Page, text: string): Promise<void> {
  const bar = page.getByTestId("browse-filter-bar");
  await expect(bar.locator(".monaco-editor").first()).toBeVisible({ timeout: 15000 });

  const applied = await page.evaluate((value) => {
    const api = (window as unknown as { monaco?: { editor: { getEditors?: () => MonacoEditor[] } } }).monaco;
    const root = document.querySelector("[data-testid='browse-filter-bar']");
    const editor = (api?.editor.getEditors?.() ?? []).find((e) => {
      const node = e.getContainerDomNode?.();
      return Boolean(root && node && root.contains(node));
    });
    if (!editor) return false;
    editor.setValue(value);
    return editor.getValue() === value;
  }, text);

  if (!applied) {
    await bar.locator(".monaco-editor").first().click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText(text);
  }

  await page.getByTestId("browse-filter-run").click();
}

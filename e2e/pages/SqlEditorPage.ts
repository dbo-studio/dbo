import { expect, type Page, type Locator } from "@playwright/test";
import { apiRoute, waitForResponseDuring } from "../helpers/network";
import { BasePage } from "./BasePage";

/**
 * Page Object for SQL Editor
 */
export class SqlEditorPage extends BasePage {
  readonly editor: Locator;
  readonly openEditorButton: Locator;
  readonly saveButton: Locator;
  readonly runButton: Locator;
  readonly formatButton: Locator;
  readonly minifyButton: Locator;

  constructor(page: Page) {
    super(page);

    this.editor = page.locator(".monaco-editor").first();
    this.openEditorButton = page.getByRole("button", { name: /open editor/i });
    this.saveButton = page.getByRole("button", { name: /save/i }).first();
    this.runButton = page.getByRole("button", { name: "Run query" });
    this.formatButton = page.getByRole("button", { name: /beatify|format/i });
    this.minifyButton = page.getByRole("button", { name: /minify/i });
  }

  get stopButton(): Locator {
    return this.page.getByTestId("stop-query");
  }

  get runQueryButton(): Locator {
    return this.page.getByTestId("run-query");
  }

  async open(): Promise<void> {
    if (await this.editor.isVisible().catch(() => false)) {
      return;
    }

    await this.page.getByRole("button", { name: "sql" }).click();
    await expect(this.editor).toBeVisible({ timeout: 15000 });
    await this.wait(500);
  }

  /** Select database/schema context used for raw-query metadata and inline edits. */
  async selectContext(database: string, schema?: string): Promise<void> {
    await this.selectLabeledOption("database", database);
    if (schema !== undefined) {
      await this.selectLabeledOption("schema", schema);
    }
  }

  private async selectLabeledOption(label: string, value: string): Promise<void> {
    const caption = this.page.getByText(new RegExp(`^${label}:$`, "i"));
    await expect(caption).toBeVisible({ timeout: 15000 });

    const selectRoot = caption.locator("xpath=following-sibling::*[1]");
    const input = selectRoot.locator("input").first();
    await expect(input).toBeEnabled({ timeout: 15000 });
    await input.click();

    const option = this.page.getByRole("option", { name: value, exact: true });
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await this.wait(300);
  }

  async focus(): Promise<void> {
    await this.editor.click();
  }

  async clearEditor(): Promise<void> {
    await this.focus();
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";
    await this.page.keyboard.press(selectAll);
  }

  async typeQuery(sql: string): Promise<void> {
    await expect(this.editor).toBeVisible({ timeout: 15000 });

    // Prefer Monaco API — keyboard.type races with SQL autocomplete and drops characters.
    const applied = await this.page.evaluate((value) => {
      const monacoApi = (
        window as unknown as {
          monaco?: {
            editor: {
              getEditors?: () => Array<{
                setValue: (v: string) => void;
                getValue: () => string;
              }>;
              getModels?: () => Array<{ setValue: (v: string) => void }>;
            };
          };
        }
      ).monaco;

      const editors = monacoApi?.editor?.getEditors?.() ?? [];
      if (editors.length > 0) {
        editors[0].setValue(value);
        return editors[0].getValue() === value;
      }

      const models = monacoApi?.editor?.getModels?.() ?? [];
      if (models.length > 0) {
        models[0].setValue(value);
        return true;
      }

      return false;
    }, sql);

    if (!applied) {
      await this.clearEditor();
      await this.page.keyboard.insertText(sql);
    }

    await expect
      .poll(
        async () =>
          this.page.evaluate(() => {
            const monacoApi = (
              window as unknown as {
                monaco?: {
                  editor: {
                    getEditors?: () => Array<{ getValue: () => string }>;
                    getModels?: () => Array<{ getValue: () => string }>;
                  };
                };
              }
            ).monaco;
            const editor = monacoApi?.editor?.getEditors?.()?.[0];
            if (editor) {
              return editor.getValue();
            }
            return monacoApi?.editor?.getModels?.()?.[0]?.getValue() ?? "";
          }),
        { timeout: 10000 },
      )
      .toBe(sql);
  }

  async runQuery(): Promise<void> {
    // Web shortcut is Alt+Enter (not Ctrl+Enter); click the toolbar button instead.
    await waitForResponseDuring(
      this.page,
      apiRoute.queryRaw,
      () => this.clickRun(),
    );
  }

  /** Click Run without waiting for a successful response (Safe Mode gates / cancel). */
  async clickRun(): Promise<void> {
    const run = this.runQueryButton.or(this.runButton);
    await expect(run).toBeVisible({ timeout: 10000 });
    await run.click();
  }

  async stopQuery(): Promise<void> {
    await expect(this.stopButton).toBeVisible({ timeout: 10000 });
    await this.stopButton.click();
  }

  async expectQueryCancelled(): Promise<void> {
    await expect(this.page.getByText(/query cancelled/i)).toBeVisible({
      timeout: 10000,
    });
  }

  async expectPaginationVisible(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: /next page|previous page/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  }

  async typeAndRun(sql: string): Promise<void> {
    // Postgres/MySQL prepared statements reject multi-command batches.
    for (const statement of splitSqlStatements(sql)) {
      await this.typeQuery(statement);
      await this.runQuery();
    }
  }

  /** Assert the query results grid shows a successful statement run. */
  async expectQuerySucceeded(querySnippet: string): Promise<void> {
    const results = this.page.getByRole("table");
    await expect(results).toBeVisible({ timeout: 15000 });
    await expect(results.getByText(querySnippet, { exact: false })).toBeVisible();
    await expect(results.getByText("OK", { exact: true })).toBeVisible();
  }

  async saveQuery(): Promise<void> {
    await expect(this.saveButton).toBeEnabled({ timeout: 10000 });
    await waitForResponseDuring(
      this.page,
      apiRoute.savedCreate,
      () => this.saveButton.click(),
    );
    await expect(this.page.getByText(/query saved successfully/i)).toBeVisible({
      timeout: 5000,
    });
  }

  async getEditorContent(): Promise<string> {
    return (await this.editor.textContent()) || "";
  }

  async expectEditorContains(text: string): Promise<void> {
    await expect(this.editor).toContainText(text);
  }
}

/** Split a SQL script into individual statements (ignores `;` inside quotes). */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : "";

    if (ch === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
      current += ch;
      continue;
    }

    if (ch === ";" && !inSingle && !inDouble) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
}

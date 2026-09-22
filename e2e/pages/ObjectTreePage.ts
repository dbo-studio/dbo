import { expect, type Locator, type Page } from "@playwright/test";
import { API_DDL_TIMEOUT, apiRoute, waitForResponseDuring } from "../helpers/network";
import { BasePage } from "./BasePage";

const toTestIdSlug = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, "-");

/**
 * Page Object for the object tree (schema browser)
 */
export class ObjectTreePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getTreeNode(name: string): Locator {
    return this.page.getByTestId(`tree-node-${toTestIdSlug(name)}`);
  }

  treeSearchInput(): Locator {
    return this.page.getByTestId("tree-search").locator("input");
  }

  /** Filter the object tree so virtualized folders still render the target node. */
  async filterTree(term: string): Promise<void> {
    const input = this.treeSearchInput();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(term);
  }

  async clearTreeFilter(): Promise<void> {
    const input = this.treeSearchInput();
    if (!(await input.isVisible().catch(() => false))) {
      return;
    }
    if ((await input.inputValue()) !== "") {
      await input.fill("");
    }
  }

  /**
   * Wait for a tree node to mount. Filters only when the node is not already in the DOM
   * so leftover search from a previous unique name cannot hide the next node.
   */
  async expectNodeVisible(name: string, timeout = 15000): Promise<Locator> {
    const node = this.getTreeNode(name);
    if (!(await node.isVisible().catch(() => false))) {
      await this.filterTree(name);
    }
    await expect(node).toBeVisible({ timeout });
    return node;
  }

  async expandNode(name: string): Promise<void> {
    const node = await this.expectNodeVisible(name);
    await node.click();

    // Only expand when collapsed. Collapse-then-expand races React state:
    // ArrowRight is ignored while the handler still sees isExpanded=true.
    const expanded = await node.getAttribute("aria-expanded");
    if (expanded === "true") {
      return;
    }

    await node.press("ArrowRight");
    await expect(node).toHaveAttribute("aria-expanded", "true", {
      timeout: 15000,
    });
    await this.waitForTreeLoad();
  }

  /**
   * Force-refresh children by waiting for collapse to commit before expanding.
   */
  async refreshExpandNode(name: string): Promise<void> {
    const node = await this.expectNodeVisible(name);
    await node.click();

    if ((await node.getAttribute("aria-expanded")) === "true") {
      await node.press("ArrowLeft");
      await expect(node).toHaveAttribute("aria-expanded", "false", {
        timeout: 15000,
      });
      await this.waitForTreeLoad();
    }

    await node.press("ArrowRight");
    await expect(node).toHaveAttribute("aria-expanded", "true", {
      timeout: 15000,
    });
    await this.waitForTreeLoad();
  }

  async expandPath(nodeNames: string[]): Promise<void> {
    for (const name of nodeNames) {
      await this.expandNode(name);
    }
  }

  async openContextMenu(nodeName: string): Promise<void> {
    const node = await this.expectNodeVisible(nodeName);
    await node.click({ button: "right" });
    await this.wait(300);
  }

  async clickContextMenuAction(actionTitle: string): Promise<void> {
    const slug = toTestIdSlug(actionTitle);
    await this.page.getByTestId(`context-menu-item-${slug}`).click();
    await this.wait(500);
  }

  async runTreeAction(nodeName: string, actionTitle: string): Promise<void> {
    await this.openContextMenu(nodeName);
    await this.clickContextMenuAction(actionTitle);
  }

  async confirmDangerAction(): Promise<void> {
    await this.page.getByRole("button", { name: "Delete" }).click();
    await this.wait(500);
  }

  async dropObject(nodeName: string, actionTitle: string): Promise<void> {
    await this.runTreeAction(nodeName, actionTitle);
    await waitForResponseDuring(
      this.page,
      apiRoute.objectExecute,
      () => this.confirmDangerAction(),
      API_DDL_TIMEOUT,
    );
    await this.waitForTreeLoad();
  }

  async waitForTreeLoad(): Promise<void> {
    await this.page
      .locator('[role="progressbar"]')
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => undefined);
    await this.wait(500);
  }
}

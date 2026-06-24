import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

const toTestIdSlug = (name: string): string => name.toLowerCase().replace(/\s+/g, '-');

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

  async expandNode(name: string): Promise<void> {
    const node = this.getTreeNode(name);
    await node.waitFor({ state: 'visible', timeout: 15000 });
    await node.click();
    await node.press('ArrowRight');
    await this.waitForTreeLoad();
  }

  async expandPath(nodeNames: string[]): Promise<void> {
    for (const name of nodeNames) {
      await this.expandNode(name);
    }
  }

  async openContextMenu(nodeName: string): Promise<void> {
    const node = this.getTreeNode(nodeName);
    await node.waitFor({ state: 'visible', timeout: 15000 });
    await node.click({ button: 'right' });
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

  async waitForTreeLoad(): Promise<void> {
    await this.page
      .locator('[role="progressbar"]')
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => undefined);
    await this.wait(500);
  }
}

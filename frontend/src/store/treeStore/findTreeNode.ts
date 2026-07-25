import type { TreeNodeType } from '@/types/Tree';

export const findTreeNode = (root: TreeNodeType | null | undefined, nodeId: string): TreeNodeType | null => {
  if (!root) {
    return null;
  }

  if (root.id === nodeId) {
    return root;
  }

  for (const child of root.children ?? []) {
    const found = findTreeNode(child, nodeId);
    if (found) {
      return found;
    }
  }

  return null;
};

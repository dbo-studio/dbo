import type { TreeNodeType } from '@/api/tree/types';

export type TreeStore = {
  tree: TreeNodeType | null;
  expandedNodes: Set<string>;
  loadedParentIds: Set<string>;
  isLoading: boolean;
  treeError: Error | undefined;

  setTree: (tree: TreeNodeType | null) => void;
  getTree: () => TreeNodeType | null;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  isNodeExpanded: (nodeId: string) => boolean;
  setNodeChildren: (nodeId: string, children: TreeNodeType[]) => void;
  addLoadedParentId: (parentId: string) => void;
  getLoadedParentIds: () => Set<string>;
  reloadTree: () => Promise<void>;
};

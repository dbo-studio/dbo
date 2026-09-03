import { TreeNodeType } from '@/types/Tree';

export type TreeStore = {
  tree: Record<string, TreeNodeType>;
  expandedNodes: Record<string, string[]>;
  loadedParentIds: Record<string, string[]>;
  focusedNodeId: Record<string, string | undefined>;
  isLoading: boolean;
  treeError: Error | undefined;

  setTree: (tree: TreeNodeType | null) => void;
  getTree: () => TreeNodeType | null;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  isNodeExpanded: (nodeId: string) => boolean;
  setFocusedNodeId: (nodeId: string | undefined) => void;
  getFocusedNodeId: () => string | undefined;
  clearFocusedNodeIdForConnection: (connectionId: string | number) => void;
  setNodeChildren: (nodeId: string, children: TreeNodeType[]) => void;
  addLoadedParentId: (parentId: string) => void;
  getLoadedParentIds: () => string[];
  reloadTree: (fromCache: boolean) => Promise<void>;
  toggleIsLoading: (isLoading: boolean) => void;
  reset: () => void;
};

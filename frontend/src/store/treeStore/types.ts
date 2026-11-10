import { TreeNodeType } from '@/types/Tree';

export type TreeStore = {
  tree: Record<string, TreeNodeType>;
  expandedNodes: Record<string, string[]>;
  loadedParentIds: Record<string, string[]>;
  focusedNodeId: Record<string, string | undefined>;
  /** Nodes pinned above the tree, per connection (snapshots without children; the real node stays in the tree). */
  pinnedNodes: Record<string, TreeNodeType[]>;
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
  pinNodes: (nodes: TreeNodeType[]) => void;
  unpinNodes: (nodeIds: string[]) => void;
  renamePinned: (nodeId: string, oldName: string, newName: string) => void;
  reloadTree: (fromCache: boolean) => Promise<void>;
  toggleIsLoading: (isLoading: boolean) => void;
  reset: () => void;
};

import type React from 'react';

export type TreeNodeData = {
  id: string;
  name: string;
  type: string;
  children?: TreeNodeData[];
  actions?: string[];
};

export type TreeNodeProps = {
  node: TreeNodeData;
  fetchChildren: (parentId: string) => Promise<TreeNodeData[]>;
  parentRefs?: React.RefObject<Map<string, HTMLDivElement>>;
  nodeIndex?: number;
  level?: number;
  onFocusChange?: (id: string) => void;
};

export type TreeViewProps = {
  initialData: TreeNodeData;
};

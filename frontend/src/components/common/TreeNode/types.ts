import type React from 'react';
import type { TreeNodeType } from '@/api/object/types.ts';

export type TreeNodeProps = {
  node: TreeNodeType;
  fetchChildren: (parentId: string) => Promise<TreeNodeType[]>;
  parentRefs?: React.RefObject<Map<string, HTMLDivElement>>;
  nodeIndex?: number;
  level?: number;
  onFocusChange?: (id: string) => void;
};

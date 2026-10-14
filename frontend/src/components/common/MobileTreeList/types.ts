import type { TreeNodeType } from '@/types/Tree';
import type { MouseEvent } from 'react';

export type MobileTreeListProps = {
  /** Node whose children are listed; the connection root when omitted. */
  nodeId?: string;
  onDrill: (node: TreeNodeType) => void;
};

export type NodeActionSheetProps = {
  node: TreeNodeType;
  actionDetection: (event: MouseEvent, node: TreeNodeType) => Promise<void>;
  onClose: () => void;
};

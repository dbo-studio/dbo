import type { TreeNodeProps } from './types';

export const areTreeNodePropsEqual = (prev: TreeNodeProps, next: TreeNodeProps): boolean =>
  prev.node === next.node &&
  prev.selectedNodeId === next.selectedNodeId &&
  prev.searchTerm === next.searchTerm &&
  prev.level === next.level &&
  prev.nodeIndex === next.nodeIndex &&
  prev.parentRefsRef === next.parentRefsRef &&
  prev.fetchChildren === next.fetchChildren &&
  prev.onContextMenu === next.onContextMenu &&
  prev.onFocusChange === next.onFocusChange;

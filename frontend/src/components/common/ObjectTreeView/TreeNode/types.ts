import type { TreeNodeType } from '@/api/tree/types';
import type { MenuType } from '@/components/base/ContextMenu/types';
import type React from 'react';
import type { RefObject } from 'react';

export type TreeNodeProps = {
  node: TreeNodeType;
  parentRefs?: React.RefObject<Map<string, HTMLDivElement>>;
  nodeIndex?: number;
  level?: number;
  searchTerm?: string;

  fetchChildren: (parentId: string) => Promise<TreeNodeType[]>;
  onFocusChange?: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, menu: MenuType[]) => void;
};

export type NodeContentProps = {
  node: TreeNodeType;
  nodeRef: RefObject<HTMLDivElement | null>;
  isFocused: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  hasChildren?: boolean;
  level: number;
  nodeIndex: number;
  focusNode: (event: React.MouseEvent) => void;
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => void;
  expandNode: (event: React.MouseEvent | React.KeyboardEvent, moveFocusToChild: boolean) => void;
  handleContextMenu: (event: React.MouseEvent) => void;
  handleBlur: () => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
};

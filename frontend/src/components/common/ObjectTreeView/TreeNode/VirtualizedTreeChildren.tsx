import type { MenuType } from '@/components/base/ContextMenu/types';
import { VIRTUAL_LIST_THRESHOLD, useVirtualList } from '@/hooks/useVirtualList';
import type { TreeNodeType } from '@/types/Tree';
import { Box } from '@mui/material';
import { memo, type JSX, type RefObject } from 'react';
import TreeNode from './TreeNode';
import { ChildrenContainer } from './TreeNode.styled';

const TREE_CHILD_ESTIMATE_PX = 24;

type TreeChildrenProps = {
  childNodes: TreeNodeType[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  fetchChildren: (parentId: string) => Promise<TreeNodeType[]>;
  parentRefsRef: RefObject<Map<string, HTMLDivElement>>;
  level: number;
  searchTerm: string;
  selectedNodeId?: string;
  onFocusChange?: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, menu: MenuType[]) => void;
};

function VirtualizedTreeChildren({
  childNodes,
  scrollContainerRef,
  fetchChildren,
  parentRefsRef,
  level,
  searchTerm,
  selectedNodeId,
  onFocusChange,
  onContextMenu
}: TreeChildrenProps): JSX.Element {
  const { parentRef, virtualItems, virtualizer } = useVirtualList({
    count: childNodes.length,
    estimateSize: TREE_CHILD_ESTIMATE_PX,
    overscan: 20,
    scrollElementRef: scrollContainerRef
  });

  return (
    <ChildrenContainer ref={parentRef}>
      <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualItems.map((virtualRow) => {
          const child = childNodes[virtualRow.index];
          if (!child) return null;

          return (
            <Box
              key={child.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <TreeNode
                node={child}
                fetchChildren={fetchChildren}
                parentRefsRef={parentRefsRef}
                nodeIndex={virtualRow.index}
                level={level + 1}
                onFocusChange={onFocusChange}
                searchTerm={searchTerm}
                onContextMenu={onContextMenu}
                selectedNodeId={selectedNodeId}
                scrollContainerRef={scrollContainerRef}
              />
            </Box>
          );
        })}
      </Box>
    </ChildrenContainer>
  );
}

function TreeChildren(props: TreeChildrenProps): JSX.Element {
  if (props.childNodes.length >= VIRTUAL_LIST_THRESHOLD) {
    return <VirtualizedTreeChildren {...props} />;
  }

  return (
    <ChildrenContainer>
      {props.childNodes.map((child, index) => (
        <TreeNode
          key={child.id}
          node={child}
          fetchChildren={props.fetchChildren}
          parentRefsRef={props.parentRefsRef}
          nodeIndex={index}
          level={props.level + 1}
          onFocusChange={props.onFocusChange}
          searchTerm={props.searchTerm}
          onContextMenu={props.onContextMenu}
          selectedNodeId={props.selectedNodeId}
          scrollContainerRef={props.scrollContainerRef}
        />
      ))}
    </ChildrenContainer>
  );
}

export default memo(TreeChildren);

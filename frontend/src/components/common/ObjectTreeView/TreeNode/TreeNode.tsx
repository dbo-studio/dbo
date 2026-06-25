import { useTreeNodeHandlers } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeHandlers';
import { useTreeNodeMenu } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeMenu';
import { NodeContent } from '@/components/common/ObjectTreeView/TreeNode/NodeContent/NodeContent';
import {
  ChildrenContainer,
  HoverableTreeNodeContainerStyled
} from '@/components/common/ObjectTreeView/TreeNode/TreeNode.styled';
import type { TreeNodeProps } from '@/components/common/ObjectTreeView/TreeNode/types';
import { useCurrentConnection } from '@/hooks/useCurrentConnection.hook';
import { findTreeNode } from '@/store/treeStore/findTreeNode';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { TreeNodeType } from '@/types/Tree';
import { Fragment, type JSX, useCallback, useEffect, useRef, useState } from 'react';
import { useActionDetection } from './hooks/useActionDetection';

export default function TreeNode({
  node: initialNode,
  parentRefsRef = { current: new Map() },
  nodeIndex = 0,
  level = 0,
  searchTerm = '',
  selectedNodeId,
  fetchChildren,
  onFocusChange,
  onContextMenu
}: TreeNodeProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const currentConnection = useCurrentConnection();
  const { isNodeExpanded, expandNode, collapseNode, setNodeChildren } = useTreeStore();

  const node =
    useTreeStore((state) => {
      if (!currentConnection?.id) {
        return initialNode;
      }

      const root = state.tree[currentConnection.id];
      return findTreeNode(root, initialNode.id) ?? initialNode;
    }) ?? initialNode;

  const isExpanded = isNodeExpanded(node.id);
  const isSelected = node.id === selectedNodeId;

  useEffect(() => {
    const parentRefsMap = parentRefsRef.current;
    if (nodeRef.current) {
      parentRefsMap.set(node.id, nodeRef.current);
    }
    return (): void => {
      parentRefsMap.delete(node.id);
    };
  }, [node.id, parentRefsRef]);

  const handleSetChildren = (newChildren: TreeNodeType[]): void => {
    const children = Array.isArray(newChildren) ? newChildren : [];
    setNodeChildren(node.id, children);
  };

  const handleIsExpanded = (expanded: boolean): void => {
    if (expanded) {
      expandNode(node.id);
    } else {
      collapseNode(node.id);
    }
  };

  const {
    expandNode: handleExpandNode,
    focusNode,
    handleBlur,
    handleKeyDown
  } = useTreeNodeHandlers({
    node,
    children: node.children ?? [],
    isExpanded,
    setIsExpanded: handleIsExpanded,
    setChildren: handleSetChildren,
    setIsLoading,
    setIsFocused,
    fetchChildren,
    parentRefsRef,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    nodeRef,
    nodeIndex,
    level,
    onFocusChange
  });

  const { actionDetection } = useActionDetection(handleExpandNode);
  const { menu } = useTreeNodeMenu(node, actionDetection);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent): void => {
      event.stopPropagation();
      onContextMenu(event, menu);
    },
    [menu, onContextMenu]
  );

  const matchesSearch = useCallback(
    (treeNode: TreeNodeType): boolean => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      const nodeNameLower = treeNode.name.toLowerCase();

      if (nodeNameLower.includes(searchLower)) return true;

      return (treeNode.children ?? []).some((child) => matchesSearch(child));
    },
    [searchTerm]
  );

  if (searchTerm && !matchesSearch(node)) {
    return <Fragment />;
  }

  const children = node.children ?? [];

  return (
    <HoverableTreeNodeContainerStyled>
      <NodeContent
        node={node}
        nodeRef={nodeRef}
        isFocused={isFocused}
        isSelected={isSelected}
        isExpanded={isExpanded}
        isLoading={isLoading}
        hasChildren={node.hasChildren}
        level={level}
        nodeIndex={nodeIndex}
        focusNode={focusNode}
        actionDetection={(event, treeNode) => void actionDetection(event, treeNode)}
        expandNode={(event, moveFocusToChild) => handleExpandNode(event, moveFocusToChild)}
        handleContextMenu={handleContextMenu}
        handleBlur={handleBlur}
        handleKeyDown={handleKeyDown}
      />
      {isExpanded && children.length > 0 && (
        <ChildrenContainer>
          {children.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              fetchChildren={fetchChildren}
              parentRefsRef={parentRefsRef}
              nodeIndex={index}
              level={level + 1}
              onFocusChange={onFocusChange}
              searchTerm={searchTerm}
              onContextMenu={onContextMenu}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </ChildrenContainer>
      )}
    </HoverableTreeNodeContainerStyled>
  );
}

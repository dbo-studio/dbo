import type { TreeNodeType } from '@/api/tree/types';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import { useTreeNodeHandlers } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeHandlers';
import { useTreeNodeMenu } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeMenu';
import { NodeContent } from '@/components/common/ObjectTreeView/TreeNode/NodeContent/NodeContent';
import {
  ChildrenContainer,
  HoverableTreeNodeContainerStyled
} from '@/components/common/ObjectTreeView/TreeNode/TreeNode.styled';
import type { TreeNodeProps } from '@/components/common/ObjectTreeView/TreeNode/types';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Fragment, type JSX, useCallback, useEffect, useRef, useState } from 'react';
import { useActionDetection } from './hooks/useActionDetection';

export default function TreeNode({
  node: initialNode,
  parentRefs = { current: new Map() },
  nodeIndex = 0,
  level = 0,
  searchTerm = '',
  selectedNodeId,
  fetchChildren,
  onFocusChange,
  onContextMenu
}: TreeNodeProps): JSX.Element {
  const [node, setNode] = useState<TreeNodeType>(initialNode);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const { isNodeExpanded, expandNode, collapseNode, setNodeChildren } = useTreeStore();

  const isExpanded = isNodeExpanded(node.id);
  const isSelected = node.id === selectedNodeId;

  useEffect(() => {
    setNode(initialNode);
  }, [initialNode]);

  useEffect(() => {
    if (nodeRef.current) {
      parentRefs.current.set(node.id, nodeRef.current);
    }
    return (): void => {
      parentRefs.current.delete(node.id);
    };
  }, [node.id, parentRefs]);

  const handleSetChildren = (newChildren: TreeNodeType[]): void => {
    //@ts-ignore
    const children = typeof newChildren === 'function' ? newChildren(node.children) : newChildren;
    setNode((prev) => ({
      ...prev,
      children: Array.isArray(children) ? children : []
    }));

    setNodeChildren(node.id, Array.isArray(children) ? children : []);
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
    children: node.children,
    isExpanded,
    setIsExpanded: handleIsExpanded,
    setChildren: handleSetChildren,
    setIsLoading,
    setIsFocused,
    fetchChildren,
    parentRefs,
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
    [node, onContextMenu]
  );

  const matchesSearch = useCallback(
    (node: TreeNodeType): boolean => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      const nodeNameLower = node.name.toLowerCase();

      if (nodeNameLower.includes(searchLower)) return true;

      return node.children.some((child) => matchesSearch(child));
    },
    [searchTerm]
  );

  // If search term is present and node doesn't match, don't render
  if (searchTerm && !matchesSearch(node)) {
    return <Fragment />;
  }

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
        actionDetection={actionDetection}
        expandNode={handleExpandNode}
        handleContextMenu={handleContextMenu}
        handleBlur={handleBlur}
        handleKeyDown={handleKeyDown}
      />
      {/* {menu.length > 0 && (
        <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
      )} */}
      {isExpanded && node.children.length > 0 && (
        <ChildrenContainer>
          {node.children.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              fetchChildren={fetchChildren}
              parentRefs={parentRefs}
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

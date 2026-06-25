import { useTreeNodeHandlers } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeHandlers';
import { useTreeNodeMenu } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeMenu';
import { NodeContent } from '@/components/common/ObjectTreeView/TreeNode/NodeContent/NodeContent';
import {
  ChildrenContainer,
  HoverableTreeNodeContainerStyled
} from '@/components/common/ObjectTreeView/TreeNode/TreeNode.styled';
import type { TreeNodeProps } from '@/components/common/ObjectTreeView/TreeNode/types';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { TreeNodeType } from '@/types/Tree';
import { Fragment, type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [localChildren, setLocalChildren] = useState<TreeNodeType[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const { isNodeExpanded, expandNode, collapseNode, setNodeChildren } = useTreeStore();

  const node = useMemo(
    () => ({
      ...initialNode,
      children: localChildren ?? initialNode.children
    }),
    [initialNode, localChildren]
  );

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
    setLocalChildren(Array.isArray(children) ? children : []);
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
        actionDetection={(event, node) => void actionDetection(event, node)}
        expandNode={(event, moveFocusToChild) => handleExpandNode(event, moveFocusToChild)}
        handleContextMenu={handleContextMenu}
        handleBlur={handleBlur}
        handleKeyDown={handleKeyDown}
      />
      {isExpanded && node.children.length > 0 && (
        <ChildrenContainer>
          {node.children.map((child, index) => (
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

import type { TreeNodeType } from '@/api/tree/types';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import { NodeContent } from '@/components/common/ObjectTreeView/TreeNode/NodeContent/NodeContent';
import { ChildrenContainer, TreeNodeContainer } from '@/components/common/ObjectTreeView/TreeNode/TreeNode.styled';
import { useTreeNodeHandlers } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeHandlers';
import { useTreeNodeMenu } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeMenu';
import type { TreeNodeProps } from '@/components/common/ObjectTreeView/TreeNode/types';
import { useContextMenu } from '@/hooks';
import { useEffect, useRef, useState } from 'react';
import { useActionDetection } from './hooks/useActionDetection';

export default function TreeNode({
  node: initialNode,
  fetchChildren,
  parentRefs = { current: new Map() },
  nodeIndex = 0,
  level = 0,
  onFocusChange
}: TreeNodeProps) {
  const [node, setNode] = useState<TreeNodeType>(initialNode);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  // Update local node when initialNode changes
  useEffect(() => {
    setNode(initialNode);
  }, [initialNode]);

  useEffect(() => {
    if (nodeRef.current) {
      parentRefs.current.set(node.id, nodeRef.current);
    }
    return () => {
      parentRefs.current.delete(node.id);
    };
  }, [node.id, parentRefs]);

  const { hasChildren, expandNode, focusNode, handleBlur, handleKeyDown } = useTreeNodeHandlers({
    node,
    children: node.children,
    isExpanded,
    setIsExpanded,
    setChildren: (newChildren) => {
      setNode((prev) => ({
        ...prev,
        children: Array.isArray(newChildren) ? newChildren : newChildren(prev.children)
      }));
    },
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

  const { actionDetection } = useActionDetection(expandNode);
  const { menu } = useTreeNodeMenu(node, actionDetection);

  return (
    <TreeNodeContainer>
      <NodeContent
        node={node}
        nodeRef={nodeRef}
        isFocused={isFocused}
        isExpanded={isExpanded}
        isLoading={isLoading}
        hasChildren={hasChildren}
        level={level}
        nodeIndex={nodeIndex}
        focusNode={focusNode}
        actionDetection={actionDetection}
        expandNode={expandNode}
        handleContextMenu={handleContextMenu}
        handleBlur={handleBlur}
        handleKeyDown={handleKeyDown}
      />
      {menu.length > 0 && (
        <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
      )}

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
            />
          ))}
        </ChildrenContainer>
      )}
    </TreeNodeContainer>
  );
}

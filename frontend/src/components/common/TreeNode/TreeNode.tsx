import type { TreeNodeType } from '@/api/tree/types';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import { NodeContent } from '@/components/common/TreeNode/NodeContent/NodeContent';
import { ChildrenContainer, TreeNodeContainer } from '@/components/common/TreeNode/TreeNode.styled.ts';
import { useTreeNodeHandlers } from '@/components/common/TreeNode/hooks/useTreeNodeHandlers';
import { useTreeNodeMenu } from '@/components/common/TreeNode/hooks/useTreeNodeMenu';
import type { TreeNodeProps } from '@/components/common/TreeNode/types.ts';
import { useContextMenu } from '@/hooks';
import { useEffect, useRef, useState } from 'react';

export default function TreeNode({
  node,
  fetchChildren,
  parentRefs = { current: new Map() },
  nodeIndex = 0,
  level = 0,
  onFocusChange
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<TreeNodeType[]>(node.children || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  useEffect(() => {
    if (nodeRef.current) {
      parentRefs.current.set(node.id, nodeRef.current);
    }
    return () => {
      parentRefs.current.delete(node.id);
    };
  }, [node.id, parentRefs]);

  const { hasChildren, expandNode, focusNode, handleBlur, handleKeyDown, actionDetection } = useTreeNodeHandlers({
    node,
    children,
    isExpanded,
    setIsExpanded,
    setChildren,
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

      {isExpanded && children?.length > 0 && (
        <ChildrenContainer>
          {children.map((child, index) => (
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

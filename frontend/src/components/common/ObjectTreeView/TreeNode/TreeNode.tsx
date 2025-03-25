import type { TreeNodeType } from '@/api/tree/types';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import { NodeContent } from '@/components/common/ObjectTreeView/TreeNode/NodeContent/NodeContent';
import {
  ChildrenContainer,
  HoverableTreeNodeContainerStyled,
  IndentGuideStyled,
  IndentGuidesContainerStyled
} from '@/components/common/ObjectTreeView/TreeNode/TreeNode.styled';
import { useTreeNodeHandlers } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeHandlers';
import { useTreeNodeMenu } from '@/components/common/ObjectTreeView/TreeNode/hooks/useTreeNodeMenu';
import type { TreeNodeProps } from '@/components/common/ObjectTreeView/TreeNode/types';
import { useContextMenu } from '@/hooks';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Box, LinearProgress } from '@mui/material';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { isNodeExpanded, expandNode, collapseNode, setNodeChildren } = useTreeStore();

  const isExpanded = isNodeExpanded(node.id);

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

  const {
    hasChildren,
    expandNode: handleExpandNode,
    focusNode,
    handleBlur,
    handleKeyDown
  } = useTreeNodeHandlers({
    node,
    children: node.children,
    isExpanded,
    setIsExpanded: (expanded) => {
      if (expanded) {
        expandNode(node.id);
      } else {
        collapseNode(node.id);
      }
    },
    setChildren: (newChildren) => {
      const children = typeof newChildren === 'function' ? newChildren(node.children) : newChildren;
      setNode((prev) => ({
        ...prev,
        children: Array.isArray(children) ? children : []
      }));

      setNodeChildren(node.id, Array.isArray(children) ? children : []);
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

  const { actionDetection } = useActionDetection(handleExpandNode);
  const { menu } = useTreeNodeMenu(node, actionDetection);

  const indentGuides =
    level > 0 ? (
      <IndentGuidesContainerStyled className='indent-guides'>
        {Array.from({ length: level }).map((_, idx) => (
          <IndentGuideStyled
            key={`indent-${node.id}-${idx}`}
            className='indent-guide'
            sx={{ right: `calc(100% - ${12 + idx * 16}px)` }}
          />
        ))}
      </IndentGuidesContainerStyled>
    ) : null;

  return (
    <HoverableTreeNodeContainerStyled>
      {indentGuides}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          pl: level * 2
        }}
      >
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
          expandNode={handleExpandNode}
          handleContextMenu={handleContextMenu}
          handleBlur={handleBlur}
          handleKeyDown={handleKeyDown}
        />
      </Box>
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
    </HoverableTreeNodeContainerStyled>
  );
}

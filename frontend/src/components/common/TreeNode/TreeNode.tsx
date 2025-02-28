import { useEffect, useRef, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import type { TreeNodeProps } from '@/components/common/TreeNode/types.ts';
import {
  ChildrenContainer,
  LoadingIndicator,
  NodeLabel,
  NodeName,
  NodeType,
  TreeNodeContainer
} from '@/components/common/TreeNode/TreeNode.styled.ts';
import { useTreeNodeHandlers } from '@/components/common/TreeNode/useTreeNodeHandlers.tsx';
import type { TreeNodeType } from '@/api/object/types.ts';

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

  return (
    <TreeNodeContainer>
      <NodeLabel
        ref={nodeRef}
        onClick={focusNode}
        onDoubleClick={(e) => actionDetection(e, node)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        isFocused={isFocused}
        role='treeitem'
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-label={`${node.name} (${node.type})`}
        tabIndex={0}
        data-level={level}
        data-index={nodeIndex}
      >
        {hasChildren && (
          <CustomIcon onClick={(e) => expandNode(e, false)} type={isExpanded ? 'arrowDown' : 'arrowRight'} />
        )}
        <NodeName isLeaf={!hasChildren} variant='body2' fontWeight={'medium'}>
          {node.name}
          {/*<NodeType variant='caption'>({node.type})</NodeType>*/}
          <NodeType variant='caption'>({node.children?.length})</NodeType>
        </NodeName>
        {isLoading && (
          <LoadingIndicator>
            <CircularProgress size={16} />
          </LoadingIndicator>
        )}
      </NodeLabel>

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

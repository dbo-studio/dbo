import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import CircularProgress from '@mui/material/CircularProgress';
import type { JSX } from 'react';
import { LoadingIndicator, NodeContent as NodeContentStyled, NodeLabel, NodeName } from '../TreeNode.styled';
import type { NodeContentProps } from '../types';

export function NodeContent({
  node,
  nodeRef,
  isFocused,
  isExpanded,
  isLoading,
  hasChildren,
  level,
  nodeIndex,
  focusNode,
  actionDetection,
  expandNode,
  handleContextMenu,
  handleBlur,
  handleKeyDown
}: NodeContentProps): JSX.Element {
  return (
    <NodeLabel
      ref={nodeRef}
      onClick={focusNode}
      onDoubleClick={(e): void => actionDetection(e, node)}
      onContextMenu={handleContextMenu}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      isFocused={isFocused}
      level={level}
      role='treeitem'
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-label={`${node.name} (${node.type})`}
      tabIndex={0}
      data-level={level}
      data-index={nodeIndex}
    >
      <NodeContentStyled>
        {hasChildren && (
          <CustomIcon
            onClick={(e): void => expandNode(e, false)}
            type={isExpanded ? 'arrowDown' : 'arrowRight'}
            size='s'
          />
        )}
        {node.icon && <CustomIcon type={node.icon as any} size='s' />}
        <NodeName isLeaf={!hasChildren}>{node.name}</NodeName>
        {isLoading && (
          <LoadingIndicator>
            <CircularProgress size={16} />
          </LoadingIndicator>
        )}
      </NodeContentStyled>
    </NodeLabel>
  );
}

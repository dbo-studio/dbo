import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import CircularProgress from '@mui/material/CircularProgress';
import type { JSX } from 'react';
import type { NodeContentProps } from '../types';
import { LoadingIndicator, NodeLabel, NodeName, NodeType } from './NodeContent.styled';

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
      role='treeitem'
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-label={`${node.name} (${node.type})`}
      tabIndex={0}
      data-level={level}
      data-index={nodeIndex}
    >
      {hasChildren && (
        <CustomIcon onClick={(e): void => expandNode(e, false)} type={isExpanded ? 'arrowDown' : 'arrowRight'} />
      )}
      <NodeName isLeaf={!hasChildren} variant='body2' fontWeight={'medium'}>
        {node.name}
        <NodeType variant='caption'>({node.children?.length})</NodeType>
      </NodeName>
      {isLoading && (
        <LoadingIndicator>
          <CircularProgress size={16} />
        </LoadingIndicator>
      )}
    </NodeLabel>
  );
}

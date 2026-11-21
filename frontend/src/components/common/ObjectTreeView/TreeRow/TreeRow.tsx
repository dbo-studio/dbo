import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { TreeNodeType } from '@/types/Tree';
import { type JSX, memo } from 'react';
import HighlightedName from '../HighlightedName/HighlightedName';
import { NodeLabel, NodeName, NodeRowContent, NodeToggleSlot } from '../ObjectTreeView.styled';
import RenameField from '../RenameField/RenameField';
import { TreeRowPosition } from './TreeRow.styled';

export type TreeRowProps = {
  node: TreeNodeType;
  level: number;
  posInSet: number;
  setSize: number;
  top: number;
  isExpanded: boolean;
  isSelected: boolean;
  isActive: boolean;
  isTabStop: boolean;
  isFocused: boolean;
  isRenaming: boolean;
  reveal: boolean;
  searchTerm: string;
  rowRef: (id: string, element: HTMLDivElement | null) => void;
  onClick: (event: React.MouseEvent, node: TreeNodeType) => void;
  onDoubleClick: (event: React.MouseEvent, node: TreeNodeType) => void;
  onContextMenu: (event: React.MouseEvent, node: TreeNodeType) => void;
  onToggle: (node: TreeNodeType) => void;
  onRenameCommit: (node: TreeNodeType, name: string) => void;
  onRenameCancel: () => void;
};

const slug = (name: string): string => name.toLowerCase().replace(/\s+/g, '-');

function TreeRow({
  node,
  level,
  posInSet,
  setSize,
  top,
  isExpanded,
  isSelected,
  isActive,
  isTabStop,
  isFocused,
  isRenaming,
  reveal,
  searchTerm,
  rowRef,
  onClick,
  onDoubleClick,
  onContextMenu,
  onToggle,
  onRenameCommit,
  onRenameCancel
}: TreeRowProps): JSX.Element {
  const hasChildren = Boolean(node.hasChildren);

  return (
    <TreeRowPosition top={top}>
      <NodeLabel
        ref={(element: HTMLDivElement | null): void => rowRef(node.id, element)}
        role='treeitem'
        tabIndex={isTabStop ? 0 : -1}
        aria-level={level + 1}
        aria-setsize={setSize}
        aria-posinset={posInSet}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-label={`${node.name} (${node.type})`}
        data-testid={`tree-node-${slug(node.name)}`}
        data-node-id={node.id}
        data-level={level}
        data-depth={level}
        data-state={hasChildren ? (isExpanded ? 'open' : 'closed') : undefined}
        data-selected={isSelected || undefined}
        data-active={isActive || undefined}
        level={level}
        isSelected={isSelected}
        isFocused={isActive && isFocused}
        reveal={reveal}
        style={reveal ? { animationDelay: `${Math.min(posInSet, 12) * 12}ms` } : undefined}
        onClick={(event): void => onClick(event, node)}
        onDoubleClick={(event): void => onDoubleClick(event, node)}
        onContextMenu={(event): void => onContextMenu(event, node)}
      >
        <NodeRowContent>
          <NodeToggleSlot
            expanded={isExpanded}
            onClick={
              hasChildren
                ? (event): void => {
                    event.stopPropagation();
                    onToggle(node);
                  }
                : undefined
            }
          >
            {hasChildren && <CustomIcon type='chevronRight' size='s' />}
          </NodeToggleSlot>
          {node.icon && <CustomIcon type={node.icon as keyof typeof IconTypes} size='s' />}
          {isRenaming ? (
            <RenameField node={node} onCommit={onRenameCommit} onCancel={onRenameCancel} />
          ) : (
            <NodeName>
              <HighlightedName name={node.name} term={searchTerm.trim()} />
            </NodeName>
          )}
        </NodeRowContent>
      </NodeLabel>
    </TreeRowPosition>
  );
}

export default memo(TreeRow);

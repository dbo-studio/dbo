import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { TreeNodeType } from '@/types/Tree';
import { type JSX, memo } from 'react';
import {
  LoadingRowStyled,
  NodeLabel,
  NodeMatch,
  NodeName,
  NodeRowContent,
  NodeToggleSlot
} from './ObjectTreeView.styled';

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
  reveal: boolean;
  searchTerm: string;
  rowRef: (id: string, element: HTMLDivElement | null) => void;
  onClick: (event: React.MouseEvent, node: TreeNodeType) => void;
  onDoubleClick: (event: React.MouseEvent, node: TreeNodeType) => void;
  onContextMenu: (event: React.MouseEvent, node: TreeNodeType) => void;
  onToggle: (node: TreeNodeType) => void;
};

const slug = (name: string): string => name.toLowerCase().replace(/\s+/g, '-');

function HighlightedName({ name, term }: { name: string; term: string }): JSX.Element {
  const start = term ? name.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (start < 0) return <>{name}</>;

  return (
    <>
      {name.slice(0, start)}
      <NodeMatch>{name.slice(start, start + term.length)}</NodeMatch>
      {name.slice(start + term.length)}
    </>
  );
}

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
  reveal,
  searchTerm,
  rowRef,
  onClick,
  onDoubleClick,
  onContextMenu,
  onToggle
}: TreeRowProps): JSX.Element {
  const hasChildren = Boolean(node.hasChildren);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${top}px)` }}>
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
          <NodeName>
            <HighlightedName name={node.name} term={searchTerm.trim()} />
          </NodeName>
        </NodeRowContent>
      </NodeLabel>
    </div>
  );
}

export default memo(TreeRow);

export function TreeLoadingRow({ level, top }: { level: number; top: number }): JSX.Element {
  return (
    <div
      aria-hidden='true'
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${top}px)` }}
    >
      <LoadingRowStyled level={level}>
        <span />
      </LoadingRowStyled>
    </div>
  );
}

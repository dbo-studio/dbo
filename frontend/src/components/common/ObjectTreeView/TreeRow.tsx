import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { TreeNodeType } from '@/types/Tree';
import { IconButton } from '@mui/material';
import { type JSX, memo, useState } from 'react';
import locales from '@/locales';
import {
  EmptyNoteStyled,
  LoadingRowStyled,
  NodeLabel,
  NodeMatch,
  NodeName,
  NodeRenameInput,
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

const FOCUS_HANDOFF_MS = 600;
const RENAME_BUTTON_SX = { p: 0, width: 18, height: 18, flexShrink: 0 };

function RenameField({
  node,
  onCommit,
  onCancel
}: {
  node: TreeNodeType;
  onCommit: (node: TreeNodeType, name: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [value, setValue] = useState(node.name);
  const [mountedAt] = useState(() => Date.now());
  // Enter/Escape unmount the field, which fires blur; the flag keeps that from committing twice.
  const [done, setDone] = useState(false);
  const finish = (commit: boolean): void => {
    if (done) return;
    setDone(true);
    if (commit) onCommit(node, value.trim());
    else onCancel();
  };

  // Buttons keep the input focused on press, so the blur-to-cancel below never eats their click.
  const keepFocus = (event: React.MouseEvent): void => event.preventDefault();
  const unchanged = !value.trim() || value.trim() === node.name;

  return (
    <>
      <NodeRenameInput
        autoFocus
        aria-label={node.name}
        data-testid='tree-rename-input'
        value={value}
        onFocus={(event): void => event.currentTarget.select()}
        onChange={(event): void => setValue(event.target.value)}
        onClick={(event): void => event.stopPropagation()}
        onDoubleClick={(event): void => event.stopPropagation()}
        onBlur={(event): void => {
          // The context menu hands focus back to the row as it closes; take it back instead of cancelling.
          if (Date.now() - mountedAt < FOCUS_HANDOFF_MS) {
            const input = event.currentTarget;
            requestAnimationFrame(() => input.focus());
            return;
          }
          finish(false);
        }}
        onKeyDown={(event): void => {
          // Keep typed characters away from the tree's type-ahead and shortcuts.
          event.stopPropagation();
          if (event.key === 'Enter') finish(true);
          else if (event.key === 'Escape') finish(false);
        }}
      />
      <IconButton
        aria-label={locales.cancel}
        sx={RENAME_BUTTON_SX}
        onMouseDown={keepFocus}
        onClick={(event): void => {
          event.stopPropagation();
          finish(false);
        }}
      >
        <CustomIcon type='close' size='xs' />
      </IconButton>
      <IconButton
        aria-label={locales.save}
        disabled={unchanged}
        sx={RENAME_BUTTON_SX}
        onMouseDown={keepFocus}
        onClick={(event): void => {
          event.stopPropagation();
          finish(true);
        }}
      >
        <CustomIcon type='check' size='xs' />
      </IconButton>
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
    </div>
  );
}

export default memo(TreeRow);

export function TreeLoadingRow({ level, top, empty }: { level: number; top: number; empty?: boolean }): JSX.Element {
  return (
    <div
      aria-hidden='true'
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${top}px)` }}
    >
      <LoadingRowStyled level={level}>
        {empty ? <EmptyNoteStyled>{locales.tree_empty_folder}</EmptyNoteStyled> : <span />}
      </LoadingRowStyled>
    </div>
  );
}

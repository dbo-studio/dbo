import { useVirtualList } from '@/hooks/useVirtualList';
import { Box } from '@mui/material';
import type { Virtualizer } from '@tanstack/react-virtual';
import { type JSX, type ReactNode, useLayoutEffect } from 'react';
import type { FlatRow } from './flattenTree';
import { TREE_ROW_HEIGHT } from './ObjectTreeView.styled';
import TreeLoadingRow from './TreeLoadingRow/TreeLoadingRow';
import TreeRow from './TreeRow/TreeRow';
import type { TreeNodeType } from '@/types/Tree';

type Props = {
  rows: FlatRow[];
  scrollElement: HTMLDivElement | null;
  contentWidth: number;
  searchTerm: string;
  selectedNodeId: string | undefined;
  selectedIds: ReadonlySet<string>;
  currentId: string | undefined;
  tabStopId: string | undefined;
  hasFocus: boolean;
  renamingId: string | undefined;
  revealParentId: string | undefined;
  searchIsSearching: boolean;
  registerScrollVirtualizer: (virtualizer: Virtualizer<HTMLElement, Element>) => void;
  setRowElement: (id: string, element: HTMLDivElement | null) => void;
  onRowClick: (event: React.MouseEvent, node: TreeNodeType) => void;
  onRowDoubleClick: (event: React.MouseEvent, node: TreeNodeType) => void;
  onRowContextMenu: (event: React.MouseEvent, node: TreeNodeType) => void;
  onToggle: (node: TreeNodeType, expand?: boolean) => void;
  onRenameCommit: (node: TreeNodeType, name: string) => void;
  onRenameCancel: () => void;
  emptyLabel: ReactNode;
};

export default function ObjectTreeVirtualBody({
  rows,
  scrollElement,
  contentWidth,
  searchTerm,
  selectedNodeId,
  selectedIds,
  currentId,
  tabStopId,
  hasFocus,
  renamingId,
  revealParentId,
  searchIsSearching,
  registerScrollVirtualizer,
  setRowElement,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  onToggle,
  onRenameCommit,
  onRenameCancel,
  emptyLabel
}: Props): JSX.Element {
  const { virtualItems, totalSize, virtualizer } = useVirtualList({
    count: rows.length,
    estimateSize: TREE_ROW_HEIGHT,
    overscan: 12,
    scrollElement
  });

  useLayoutEffect(() => {
    registerScrollVirtualizer(virtualizer);
  }, [registerScrollVirtualizer, virtualizer]);

  return (
    <>
      {searchTerm && rows.length === 0 && !searchIsSearching && <>{emptyLabel}</>}
      <Box sx={{ height: totalSize, position: 'relative', minWidth: '100%', width: contentWidth }}>
        {virtualItems.map((item) => {
          const row = rows[item.index];
          if (!row) return null;
          if (row.kind === 'loading')
            return <TreeLoadingRow key={row.key} level={row.level} top={item.start} empty={row.empty} />;

          return (
            <TreeRow
              key={row.key}
              node={row.node}
              level={row.level}
              posInSet={row.posInSet}
              setSize={row.setSize}
              top={item.start}
              isExpanded={row.isExpanded}
              isSelected={row.key === selectedNodeId || selectedIds.has(row.key)}
              isActive={row.key === currentId}
              isTabStop={row.key === tabStopId}
              isFocused={hasFocus}
              isRenaming={row.key === renamingId}
              reveal={row.parentId !== null && row.parentId === revealParentId}
              searchTerm={searchTerm}
              rowRef={setRowElement}
              onClick={onRowClick}
              onDoubleClick={onRowDoubleClick}
              onContextMenu={onRowContextMenu}
              onToggle={onToggle}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
            />
          );
        })}
      </Box>
    </>
  );
}

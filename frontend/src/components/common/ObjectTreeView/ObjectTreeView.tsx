import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import Search from '@/components/base/Search/Search';
import locales from '@/locales';
import { Box, LinearProgress } from '@mui/material';
import { type JSX } from 'react';
import {
  NodeLabel,
  NodeName,
  NodeRowContent,
  PinnedSectionStyled,
  PinnedTitleStyled,
  TreeEmptyStyled,
  TreeSearchStatusStyled,
  TreeViewContainerStyled,
  TreeViewContentStyled
} from './ObjectTreeView.styled';
import TreeLoadingRow from './TreeLoadingRow/TreeLoadingRow';
import TreeRow from './TreeRow/TreeRow';
import { findNode, useObjectTreeView } from './useObjectTreeView';

export default function ObjectTreeView(): JSX.Element {
  const tree = useObjectTreeView();

  return (
    <TreeViewContainerStyled onKeyDown={tree.handleContainerKeyDown}>
      <Box data-testid='tree-search' sx={{ mt: 1 }}>
        <Search
          value={tree.searchTerm}
          onChange={tree.setSearchTerm}
          inputRef={tree.searchInputRef}
          onKeyDown={tree.handleSearchKeyDown}
          placeholder={locales.tree_search_placeholder}
        />
      </Box>
      {tree.isLoading && (
        <Box sx={{ px: 1, py: 0.5 }}>
          <LinearProgress sx={{ height: 2 }} />
        </Box>
      )}
      {tree.searchStatus && (
        <TreeSearchStatusStyled aria-live='polite' data-testid='tree-search-status'>
          {tree.searchStatus}
        </TreeSearchStatusStyled>
      )}
      <Box
        aria-live='polite'
        sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      >
        {tree.loadingIds.size > 0 ? locales.tree_loading : ''}
      </Box>
      {tree.pinned.length > 0 && (
        <PinnedSectionStyled data-testid='tree-pinned'>
          <PinnedTitleStyled>{locales.tree_pinned}</PinnedTitleStyled>
          {tree.pinned.map((pin) => {
            // Prefer the live node (fresh action/menu); the snapshot covers folders not loaded yet.
            const node = findNode(tree.tree, pin.id) ?? pin;
            return (
              <NodeLabel
                key={pin.id}
                level={0}
                isSelected={pin.id === tree.selectedNodeId}
                tabIndex={0}
                data-testid={`tree-pinned-${pin.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={(): void => tree.open(node)}
                onContextMenu={(event): void => tree.handleRowContextMenu(event, node)}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter') tree.open(node);
                }}
              >
                <NodeRowContent>
                  {node.icon && <CustomIcon type={node.icon as keyof typeof IconTypes} size='s' />}
                  <NodeName>{pin.name}</NodeName>
                </NodeRowContent>
              </NodeLabel>
            );
          })}
        </PinnedSectionStyled>
      )}
      <TreeViewContentStyled
        ref={tree.scrollContainerRef}
        role='tree'
        aria-label={tree.currentConnection?.name}
        onContextMenu={tree.handleEmptyContextMenu}
        onKeyDown={tree.handleTreeKeyDown}
        onFocus={tree.handleTreeFocus}
        onBlur={tree.handleTreeBlur}
      >
        {tree.searchTerm && tree.rows.length === 0 && !tree.search.isSearching && (
          <TreeEmptyStyled>{locales.tree_no_matches}</TreeEmptyStyled>
        )}
        <Box sx={{ height: tree.totalSize, position: 'relative', minWidth: '100%', width: tree.contentWidth }}>
          {tree.virtualItems.map((item) => {
            const row = tree.rows[item.index];
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
                isSelected={row.key === tree.selectedNodeId || tree.selectedIds.has(row.key)}
                isActive={row.key === tree.currentId}
                isTabStop={row.key === tree.tabStopId}
                isFocused={tree.hasFocus}
                isRenaming={row.key === tree.renamingId}
                reveal={row.parentId !== null && row.parentId === tree.revealParentId}
                searchTerm={tree.searchTerm}
                rowRef={tree.setRowElement}
                onClick={tree.handleRowClick}
                onDoubleClick={tree.handleRowDoubleClick}
                onContextMenu={tree.handleRowContextMenu}
                onToggle={tree.toggle}
                onRenameCommit={tree.commitRename}
                onRenameCancel={tree.cancelRename}
              />
            );
          })}
        </Box>
      </TreeViewContentStyled>
      {tree.menu.length > 0 && (
        <ContextMenu
          menu={tree.menu}
          contextMenu={tree.contextMenuPosition}
          onClose={tree.closeMenu}
          focusFirstItem={tree.menuFromKeyboard}
        />
      )}
    </TreeViewContainerStyled>
  );
}

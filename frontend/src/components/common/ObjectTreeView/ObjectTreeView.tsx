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
import ObjectTreeVirtualBody from './ObjectTreeVirtualBody';
import RenameField from './RenameField/RenameField';
import { findNode, useObjectTreeView } from './useObjectTreeView';

export default function ObjectTreeView(): JSX.Element {
  const {
    currentConnection,
    tree,
    isLoading,
    searchTerm,
    setSearchTerm,
    setSearchInputEl,
    handleSearchKeyDown,
    searchStatus,
    search,
    loadingIds,
    pinned,
    selectedNodeId,
    rows,
    contentWidth,
    scrollElement,
    setScrollContainer,
    registerScrollVirtualizer,
    handleEmptyContextMenu,
    handleContainerKeyDown,
    handleTreeKeyDown,
    handleTreeFocus,
    handleTreeBlur,
    currentId,
    tabStopId,
    hasFocus,
    selectedIds,
    renamingId,
    renamingPinId,
    edit,
    revealParentId,
    setRowElement,
    handleRowClick,
    handleRowDoubleClick,
    handleRowContextMenu,
    toggle,
    commitRename,
    cancelRename,
    open,
    menu,
    contextMenuPosition,
    closeMenu,
    menuFromKeyboard
  } = useObjectTreeView();

  return (
    <TreeViewContainerStyled onKeyDown={handleContainerKeyDown}>
      <Box data-testid='tree-search' sx={{ mt: 1 }}>
        <Search
          value={searchTerm}
          onChange={setSearchTerm}
          inputRef={setSearchInputEl}
          onKeyDown={handleSearchKeyDown}
          placeholder={locales.tree_search_placeholder}
        />
      </Box>
      {isLoading && (
        <Box sx={{ px: 1, py: 0.5 }}>
          <LinearProgress sx={{ height: 2 }} />
        </Box>
      )}
      {searchStatus && (
        <TreeSearchStatusStyled aria-live='polite' data-testid='tree-search-status'>
          {searchStatus}
        </TreeSearchStatusStyled>
      )}
      <Box
        aria-live='polite'
        sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      >
        {loadingIds.size > 0 ? locales.tree_loading : ''}
      </Box>
      {pinned.length > 0 && (
        <PinnedSectionStyled data-testid='tree-pinned'>
          <PinnedTitleStyled>{locales.tree_pinned}</PinnedTitleStyled>
          {pinned.map((pin) => {
            const node = findNode(tree, pin.id) ?? pin;
            return (
              <NodeLabel
                key={pin.id}
                level={0}
                isSelected={pin.id === selectedNodeId}
                tabIndex={0}
                data-testid={`tree-pinned-${pin.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={(): void => open(node)}
                onContextMenu={(event): void => handleRowContextMenu(event, node, true)}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter') open(node);
                  if (event.key === 'F2') edit(node, true);
                }}
              >
                <NodeRowContent>
                  {node.icon && <CustomIcon type={node.icon as keyof typeof IconTypes} size='s' />}
                  {renamingPinId === node.id ? (
                    <RenameField node={node} onCommit={commitRename} onCancel={cancelRename} />
                  ) : (
                    <NodeName>{pin.name}</NodeName>
                  )}
                </NodeRowContent>
              </NodeLabel>
            );
          })}
        </PinnedSectionStyled>
      )}
      <TreeViewContentStyled
        ref={setScrollContainer}
        role='tree'
        aria-label={currentConnection?.name}
        onContextMenu={handleEmptyContextMenu}
        onKeyDown={handleTreeKeyDown}
        onFocus={handleTreeFocus}
        onBlur={handleTreeBlur}
      >
        <ObjectTreeVirtualBody
          rows={rows}
          scrollElement={scrollElement}
          contentWidth={contentWidth}
          searchTerm={searchTerm}
          selectedNodeId={selectedNodeId}
          selectedIds={selectedIds}
          currentId={currentId}
          tabStopId={tabStopId}
          hasFocus={hasFocus}
          renamingId={renamingId}
          revealParentId={revealParentId}
          searchIsSearching={search.isSearching}
          registerScrollVirtualizer={registerScrollVirtualizer}
          setRowElement={setRowElement}
          onRowClick={handleRowClick}
          onRowDoubleClick={handleRowDoubleClick}
          onRowContextMenu={handleRowContextMenu}
          onToggle={toggle}
          onRenameCommit={commitRename}
          onRenameCancel={cancelRename}
          emptyLabel={<TreeEmptyStyled>{locales.tree_no_matches}</TreeEmptyStyled>}
        />
      </TreeViewContentStyled>
      {menu.length > 0 && (
        <ContextMenu
          menu={menu}
          contextMenu={contextMenuPosition}
          onClose={closeMenu}
          focusFirstItem={menuFromKeyboard}
        />
      )}
    </TreeViewContainerStyled>
  );
}

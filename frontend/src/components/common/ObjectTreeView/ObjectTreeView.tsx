import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import Search from '@/components/base/Search/Search';
import { useContextMenu, useCurrentConnection, useSelectedTab } from '@/hooks';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useVirtualList } from '@/hooks/useVirtualList';
import locales from '@/locales';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { TreeNodeType } from '@/types/Tree';
import { alpha, Box, LinearProgress, useTheme } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { type JSX, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flattenTree } from './flattenTree';
import { mergeSearchResults } from './mergeSearchResults';
import {
  TREE_CHAR_WIDTH,
  TREE_INDENT,
  TREE_ROW_HEIGHT,
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
import { useActionDetection } from './TreeNode/hooks/useActionDetection';
import { useTreeNodeMenuBuilder } from './TreeNode/hooks/useTreeNodeMenu';
import TreeRow, { TreeLoadingRow } from './TreeRow';
import { useTreeKeyboard } from './useTreeKeyboard';
import { useTreeSearch } from './useTreeSearch';

const EMPTY_IDS: string[] = [];
const EMPTY_SET: ReadonlySet<string> = new Set();
const EMPTY_NODES: TreeNodeType[] = [];
const REVEAL_MS = 500;
const LOADING_DELAY_MS = 200;
const FLASH_MS = 900;
const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// The shared action hook only needs stopPropagation from the event.
const syntheticEvent = { stopPropagation: (): void => {} } as React.MouseEvent;
// Folders are toggled here, so the action hook never has to expand anything itself.
const noExpand = async (): Promise<void> => {};

const findNode = (node: TreeNodeType | null | undefined, id: string): TreeNodeType | undefined => {
  if (!node) return undefined;
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
};

const nextFrame = (fn: () => void): void => {
  requestAnimationFrame(() => requestAnimationFrame(fn));
};

/** Deferred refocus that never steals focus the user (or an opened form) already moved somewhere else. */
const refocusIfLost = (element: HTMLElement | undefined): void => {
  nextFrame(() => {
    const active = document.activeElement;
    if (!active || active === document.body) element?.focus({ preventScroll: true });
  });
};

export default function ObjectTreeView(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const connectionId = currentConnection?.id;
  const selectedNodeId = useSelectedTab()?.nodeId;
  const { isTouch, useSidebarOverlay } = useLayoutMode();
  const preferSingleClick = isTouch || useSidebarOverlay;
  const theme = useTheme();
  const flashColor = alpha(theme.palette.primary.main, 0.25);

  const isLoading = useTreeStore((state) => state.isLoading);
  const treeError = useTreeStore((state) => state.treeError);
  const tree = useTreeStore((state) => (connectionId ? (state.tree[connectionId] ?? null) : null));
  const expandedList = useTreeStore((state) => (connectionId ? state.expandedNodes[connectionId] : undefined));
  const { addLoadedParentId, reloadTree, setFocusedNodeId } = useTreeStore.getState();

  const [searchTerm, setSearchTerm] = useState('');
  // Folders the user collapsed while a search was auto-expanding them; forgotten when the term changes.
  const [searchCollapsed, setSearchCollapsed] = useState<{ term: string; ids: ReadonlySet<string> }>(() => ({
    term: '',
    ids: new Set()
  }));
  const collapsedDuringSearch = searchCollapsed.term === searchTerm ? searchCollapsed.ids : EMPTY_SET;
  // Delayed: a load that finishes quickly never flashes a placeholder row.
  const [loadingIds, setLoadingIds] = useState<ReadonlySet<string>>(() => new Set());
  const loadingTimersRef = useRef(new Map<string, number>());
  const [emptyIds, setEmptyIds] = useState<ReadonlySet<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [hasFocus, setHasFocus] = useState(false);
  const [revealParentId, setRevealParentId] = useState<string | undefined>(undefined);
  const [menu, setMenu] = useState<MenuType[]>([]);
  const [menuFromKeyboard, setMenuFromKeyboard] = useState(false);
  const [renamingId, setRenamingId] = useState<string | undefined>(undefined);
  // Cmd/Ctrl+click and Shift+click build this set; the anchor is where a Shift range starts.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [anchorId, setAnchorId] = useState<string | undefined>(undefined);
  const pinned = useTreeStore((state) => (connectionId ? state.pinnedNodes[connectionId] : undefined)) ?? EMPTY_NODES;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowElementsRef = useRef(new Map<string, HTMLDivElement>());
  const parentOfRef = useRef(new Map<string, string | null>());

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { mutateAsync: getChildren } = useMutation({ mutationFn: api.tree.getTree });

  useEffect(() => {
    if (!treeError && !tree && !isLoading && connectionId) {
      reloadTree(true).catch(() => undefined);
    }
  }, [connectionId, tree, treeError, isLoading, reloadTree]);

  const search = useTreeSearch(connectionId, searchTerm);
  // While searching, server hits from unopened folders are merged into the loaded tree; the filter then shows only matches.
  const displayTree = useMemo(
    () => (searchTerm.trim() && search.data ? mergeSearchResults(tree, search.data.results) : tree),
    [search.data, searchTerm, tree]
  );

  const expandedIds = useMemo(() => new Set(expandedList ?? EMPTY_IDS), [expandedList]);
  const rows = useMemo(
    () => flattenTree(displayTree, expandedIds, loadingIds, searchTerm, collapsedDuringSearch, emptyIds),
    [displayTree, expandedIds, loadingIds, searchTerm, collapsedDuringSearch, emptyIds]
  );

  const { virtualItems, totalSize, virtualizer } = useVirtualList({
    count: rows.length,
    estimateSize: TREE_ROW_HEIGHT,
    overscan: 12,
    scrollElementRef: scrollContainerRef
  });

  // Widest row decides the horizontal scroll extent (rows are virtualized, so measure from data, not DOM).
  const contentWidth = useMemo(
    () =>
      rows.reduce(
        (max, r) =>
          Math.max(max, r.level * TREE_INDENT + 64 + (r.kind === 'node' ? r.node.name.length * TREE_CHAR_WIDTH : 0)),
        0
      ),
    [rows]
  );

  const rowIndex = useCallback((id: string | undefined): number => rows.findIndex((r) => r.key === id), [rows]);

  // When the active row is collapsed away or reloaded, its nearest visible ancestor takes over.
  let currentId = activeId;
  while (currentId && rowIndex(currentId) < 0) currentId = parentOfRef.current.get(currentId) ?? undefined;

  const focusRow = useCallback(
    (id: string): void => {
      const index = rowIndex(id);
      if (index < 0) return;
      setActiveId(id);
      virtualizer.scrollToIndex(index, { align: 'auto' });
      // Rendered rows take focus now (keys typed right after still land in the tree); others once scrolled in.
      const element = rowElementsRef.current.get(id);
      if (element) element.focus({ preventScroll: true });
      else nextFrame(() => rowElementsRef.current.get(id)?.focus({ preventScroll: true }));
    },
    [rowIndex, virtualizer]
  );

  const moveTo = useCallback(
    (index: number): void => {
      const row = rows[index];
      if (row?.kind === 'node') focusRow(row.key);
    },
    [focusRow, rows]
  );

  const setLoading = (id: string, loading: boolean): void => {
    const timers = loadingTimersRef.current;
    window.clearTimeout(timers.get(id));
    timers.delete(id);
    const update = (isLoading: boolean): void =>
      setLoadingIds((prev) => {
        const next = new Set(prev);
        if (isLoading) next.add(id);
        else next.delete(id);
        return next;
      });

    if (!loading) {
      update(false);
      return;
    }
    setEmptyIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    timers.set(
      id,
      window.setTimeout(() => update(true), LOADING_DELAY_MS)
    );
  };

  const revealChildrenOf = (id: string): void => {
    setRevealParentId(id);
    window.setTimeout(() => setRevealParentId((current) => (current === id ? undefined : current)), REVEAL_MS);
  };

  const loadChildren = useCallback(
    async (node: TreeNodeType, fromCache: boolean): Promise<void> => {
      if (!connectionId) return;
      setLoading(node.id, true);
      try {
        addLoadedParentId(node.id);
        const result = await getChildren({ parentId: node.id, connectionId, fromCache });
        const children = result?.children ?? [];
        useTreeStore.getState().setNodeChildren(node.id, children);
        if (children.length === 0) setEmptyIds((prev) => new Set(prev).add(node.id));
        else revealChildrenOf(node.id);
      } catch {
        useTreeStore.getState().setNodeChildren(node.id, []);
      } finally {
        setLoading(node.id, false);
      }
    },
    [addLoadedParentId, connectionId, getChildren]
  );

  const toggle = useCallback(
    (node: TreeNodeType, expand?: boolean): void => {
      if (!node.hasChildren) return;
      const { expandNode, collapseNode } = useTreeStore.getState();
      // Effective state: while searching, a folder can look open without being in the persisted expanded list.
      const visibleRow = rows.find((row) => row.key === node.id);
      const isOpen = visibleRow?.kind === 'node' ? visibleRow.isExpanded : expandedIds.has(node.id);
      const shouldOpen = expand ?? !isOpen;
      if (shouldOpen === isOpen) return;

      const trackSearchCollapse = (collapsed: boolean): void =>
        setSearchCollapsed((prev) => {
          const ids = new Set(prev.term === searchTerm ? prev.ids : []);
          if (collapsed) ids.add(node.id);
          else ids.delete(node.id);
          return { term: searchTerm, ids };
        });

      if (!shouldOpen) {
        collapseNode(node.id);
        if (searchTerm.trim()) trackSearchCollapse(true);
        return;
      }

      if (searchTerm.trim()) trackSearchCollapse(false);
      expandNode(node.id);
      if ((node.children ?? []).length === 0) {
        void loadChildren(node, true);
        return;
      }
      revealChildrenOf(node.id);
    },
    [expandedIds, loadChildren, rows, searchTerm]
  );

  /** Shift+Right: open the node and every folder below it that is already loaded (never fetches a whole schema). */
  const expandLoaded = useCallback(
    (node: TreeNodeType): void => {
      toggle(node, true);
      const walk = (n: TreeNodeType): void => {
        (n.children ?? []).forEach((child) => {
          if (child.hasChildren && (child.children ?? []).length > 0) {
            if (!expandedIds.has(child.id)) useTreeStore.getState().expandNode(child.id);
            walk(child);
          }
        });
      };
      walk(node);
    },
    [expandedIds, toggle]
  );

  const { actionDetection, renameNode, dropNodes } = useActionDetection(noExpand);
  const buildMenu = useTreeNodeMenuBuilder(actionDetection, {
    onRename: (node) => setRenamingId(node.id),
    onDropMany: (nodes) => {
      setSelectedIds(EMPTY_SET);
      dropNodes(nodes);
    }
  });

  const selectedNodes = useMemo(
    () => rows.flatMap((row) => (row.kind === 'node' && selectedIds.has(row.key) ? [row.node] : [])),
    [rows, selectedIds]
  );

  /** Expands the real (loaded) tree down to a node found by search, loading each folder on the way. */
  const revealInTree = useCallback(
    async (nodeId: string): Promise<void> => {
      const ancestors: string[] = [];
      for (let id = parentOfRef.current.get(nodeId); id; id = parentOfRef.current.get(id) ?? undefined) {
        ancestors.unshift(id);
      }

      for (const id of ancestors) {
        const node = connectionId ? findNode(useTreeStore.getState().tree[connectionId], id) : undefined;
        if (!node) return;
        if (!useTreeStore.getState().isNodeExpanded(id)) useTreeStore.getState().expandNode(id);
        if (node.hasChildren && (node.children ?? []).length === 0) await loadChildren(node, true);
      }
    },
    [connectionId, loadChildren]
  );

  const open = useCallback(
    (node: TreeNodeType): void => {
      if (!node.action) {
        toggle(node);
        return;
      }
      // Opening a search hit also reveals it in the tree, so it is still there once the search is cleared.
      if (searchTerm.trim()) void revealInTree(node.id);
      void actionDetection(syntheticEvent, node);
    },
    [actionDetection, revealInTree, searchTerm, toggle]
  );

  const refresh = useCallback(
    (node: TreeNodeType): void => {
      if (node.id === tree?.id) {
        void reloadTree(false).catch(() => undefined);
        return;
      }
      if (node.hasChildren && expandedIds.has(node.id)) {
        void loadChildren(node, false);
        return;
      }
      const parentId = parentOfRef.current.get(node.id);
      const parentRow = rows.find((r) => r.key === parentId);
      if (parentRow?.kind === 'node') void loadChildren(parentRow.node, false);
    },
    [expandedIds, loadChildren, reloadTree, rows, tree?.id]
  );

  const edit = useCallback(
    (node: TreeNodeType): void => {
      // F2 renames what can be renamed; otherwise it opens the object's editor.
      if (node.contextMenu?.some((a) => a.name === 'rename')) {
        setRenamingId(node.id);
        return;
      }
      const action = node.contextMenu?.find((a) => a.name.startsWith('edit'));
      if (action) void actionDetection(syntheticEvent, { ...node, action });
    },
    [actionDetection]
  );

  const showMenu = useCallback(
    (
      event: Pick<React.MouseEvent, 'preventDefault' | 'clientX' | 'clientY'>,
      node: TreeNodeType,
      fromKeyboard = false
    ): void => {
      setActiveId(node.id);
      setMenuFromKeyboard(fromKeyboard);
      // Right-clicking outside the multi-selection acts on that one row only.
      const inSelection = selectedIds.has(node.id);
      if (!inSelection) setSelectedIds(EMPTY_SET);
      setMenu(buildMenu(node, inSelection ? selectedNodes : [node]));
      handleContextMenu(event as React.MouseEvent);
    },
    [buildMenu, handleContextMenu, selectedIds, selectedNodes]
  );

  const openMenuFromKeyboard = useCallback(
    (node: TreeNodeType): void => {
      const rect = rowElementsRef.current.get(node.id)?.getBoundingClientRect();
      if (!rect) return;
      showMenu({ preventDefault: () => undefined, clientX: rect.left + 24, clientY: rect.bottom }, node, true);
    },
    [showMenu]
  );

  const closeMenu = useCallback((): void => {
    handleCloseContextMenu();
    const id = currentId;
    if (id) refocusIfLost(rowElementsRef.current.get(id));
  }, [currentId, handleCloseContextMenu]);

  const focusSearch = useCallback((): void => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  const handleTreeKeyDown = useTreeKeyboard({
    rows,
    activeId: currentId,
    pageSize: () => Math.max(1, Math.floor((scrollContainerRef.current?.clientHeight ?? 0) / TREE_ROW_HEIGHT) - 1),
    moveTo,
    toggle,
    expandLoaded,
    open,
    openMenu: openMenuFromKeyboard,
    refresh,
    edit,
    focusSearch
  });

  // Remember parents of every visible row, so focus can fall back to an ancestor when its row disappears.
  useEffect(() => {
    rows.forEach((row) => {
      if (row.kind === 'node') parentOfRef.current.set(row.key, row.parentId);
    });
  }, [rows]);

  // Keep keyboard focus inside the tree in that case (focusing the row updates activeId via onFocus).
  useEffect(() => {
    const id = currentId;
    if (hasFocus && id && id !== activeId) {
      nextFrame(() => {
        const active = document.activeElement;
        if (!active || active === document.body) rowElementsRef.current.get(id)?.focus({ preventScroll: true });
      });
    }
  }, [activeId, currentId, hasFocus]);

  // Opening a tab for a node that is scrolled out of view brings it into view and flashes it once.
  const lastSelectedRef = useRef(selectedNodeId);
  useEffect(() => {
    if (selectedNodeId === lastSelectedRef.current) return;
    lastSelectedRef.current = selectedNodeId;
    const index = rowIndex(selectedNodeId);
    const scroller = scrollContainerRef.current;
    if (!selectedNodeId || index < 0 || !scroller) return;

    const top = index * TREE_ROW_HEIGHT;
    const visible = top >= scroller.scrollTop && top + TREE_ROW_HEIGHT <= scroller.scrollTop + scroller.clientHeight;
    if (visible) return;

    virtualizer.scrollToIndex(index, { align: 'center' });
    if (prefersReducedMotion()) return;
    nextFrame(() =>
      rowElementsRef.current
        .get(selectedNodeId)
        ?.animate([{ backgroundColor: flashColor }, { backgroundColor: 'transparent' }], { duration: FLASH_MS })
    );
  }, [flashColor, rowIndex, selectedNodeId, virtualizer]);

  const tabStopId = currentId || (selectedNodeId && rowIndex(selectedNodeId) >= 0 && selectedNodeId) || rows[0]?.key;

  const setRowElement = useCallback((id: string, element: HTMLDivElement | null): void => {
    if (element) rowElementsRef.current.set(id, element);
    else rowElementsRef.current.delete(id);
  }, []);

  const handleRowClick = useCallback(
    (event: React.MouseEvent, node: TreeNodeType): void => {
      setActiveId(node.id);
      if (event.metaKey || event.ctrlKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          // The row that was active joins the selection the first time a modifier click starts one.
          if (prev.size === 0 && anchorId) next.add(anchorId);
          if (next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          return next;
        });
        setAnchorId(node.id);
        return;
      }
      if (event.shiftKey && anchorId) {
        const from = rowIndex(anchorId);
        const to = rowIndex(node.id);
        if (from >= 0 && to >= 0) {
          const [start, end] = from < to ? [from, to] : [to, from];
          setSelectedIds(new Set(rows.slice(start, end + 1).flatMap((row) => (row.kind === 'node' ? [row.key] : []))));
          return;
        }
      }
      setSelectedIds(EMPTY_SET);
      setAnchorId(node.id);
      setFocusedNodeId(node.id);
      if (preferSingleClick) open(node);
      else toggle(node);
    },
    [anchorId, open, preferSingleClick, rowIndex, rows, setFocusedNodeId, toggle]
  );

  const cancelRename = useCallback((): void => {
    const id = renamingId;
    setRenamingId(undefined);
    if (id) refocusIfLost(rowElementsRef.current.get(id));
  }, [renamingId]);

  const commitRename = useCallback(
    (node: TreeNodeType, name: string): void => {
      cancelRename();
      if (name && name !== node.name) void renameNode(node, name);
    },
    [cancelRename, renameNode]
  );

  const handleRowDoubleClick = useCallback(
    (_event: React.MouseEvent, node: TreeNodeType): void => {
      if (!preferSingleClick && node.action) open(node);
    },
    [open, preferSingleClick]
  );

  const handleRowContextMenu = useCallback(
    (event: React.MouseEvent, node: TreeNodeType): void => {
      event.stopPropagation();
      showMenu(event, node);
    },
    [showMenu]
  );

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveTo(rows.findIndex((r) => r.kind === 'node'));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (searchTerm) setSearchTerm('');
      else if (tabStopId) focusRow(tabStopId);
    }
  };

  const handleContainerKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && selectedIds.size > 0 && !renamingId) setSelectedIds(EMPTY_SET);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      focusSearch();
    }
  };

  const matchCount = search.data?.results.length ?? 0;
  let searchStatus = '';
  if (searchTerm.trim()) {
    if (search.isSearching && !search.data) searchStatus = locales.tree_searching;
    else if (search.data?.truncated) searchStatus = locales.tree_search_truncated.replace('{n}', String(matchCount));
    else if (matchCount === 0) searchStatus = '';
    else if (matchCount === 1) searchStatus = locales.tree_search_result;
    else searchStatus = locales.tree_search_results.replace('{n}', String(matchCount));
  }

  return (
    <TreeViewContainerStyled onKeyDown={handleContainerKeyDown}>
      <Box data-testid='tree-search' sx={{ mt: 1 }}>
        <Search
          value={searchTerm}
          onChange={setSearchTerm}
          inputRef={searchInputRef}
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
            // Prefer the live node (fresh action/menu); the snapshot covers folders not loaded yet.
            const node = findNode(tree, pin.id) ?? pin;
            return (
              <NodeLabel
                key={pin.id}
                level={0}
                isSelected={pin.id === selectedNodeId}
                tabIndex={0}
                data-testid={`tree-pinned-${pin.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={(): void => open(node)}
                onContextMenu={(event): void => handleRowContextMenu(event, node)}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter') open(node);
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
        ref={scrollContainerRef}
        role='tree'
        aria-label={currentConnection?.name}
        onKeyDown={handleTreeKeyDown}
        onFocus={(event): void => {
          setHasFocus(true);
          const id = (event.target as HTMLElement).dataset.nodeId;
          if (id) {
            setActiveId(id);
            setFocusedNodeId(id);
          }
        }}
        onBlur={(event): void => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
        }}
      >
        {searchTerm && rows.length === 0 && !search.isSearching && (
          <TreeEmptyStyled>{locales.tree_no_matches}</TreeEmptyStyled>
        )}
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
                onClick={handleRowClick}
                onDoubleClick={handleRowDoubleClick}
                onContextMenu={handleRowContextMenu}
                onToggle={toggle}
                onRenameCommit={commitRename}
                onRenameCancel={cancelRename}
              />
            );
          })}
        </Box>
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

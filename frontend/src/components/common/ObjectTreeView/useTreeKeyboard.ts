import type { TreeNodeType } from '@/types/Tree';
import { type KeyboardEvent, useCallback, useRef } from 'react';
import type { FlatNodeRow, FlatRow } from './flattenTree';

type Args = {
  rows: FlatRow[];
  activeId: string | undefined;
  pageSize: () => number;
  moveTo: (index: number) => void;
  toggle: (node: TreeNodeType, expand?: boolean) => void;
  expandLoaded: (node: TreeNodeType) => void;
  open: (node: TreeNodeType) => void;
  openMenu: (node: TreeNodeType) => void;
  refresh: (node: TreeNodeType) => void;
  edit: (node: TreeNodeType) => void;
  focusSearch: () => void;
};

const TYPE_AHEAD_RESET_MS = 500;

const isNodeRow = (row: FlatRow | undefined): row is FlatNodeRow => row?.kind === 'node';

/** VS Code style tree keys. Works on the visible row list, so it is independent of DOM nesting. */
export function useTreeKeyboard({
  rows,
  activeId,
  pageSize,
  moveTo,
  toggle,
  expandLoaded,
  open,
  openMenu,
  refresh,
  edit,
  focusSearch
}: Args): (event: KeyboardEvent) => void {
  const typeAheadRef = useRef({ text: '', at: 0 });

  return useCallback(
    (event: KeyboardEvent): void => {
      // Any non-character key ends the current type-ahead word.
      if (event.key.length !== 1) typeAheadRef.current.text = '';

      const index = rows.findIndex((row) => row.key === activeId);
      const row = rows[index];
      if (!isNodeRow(row)) {
        if (rows.length > 0 && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          moveTo(0);
        }
        return;
      }

      const { node } = row;
      const hasChildren = Boolean(node.hasChildren);
      const nodeIndexes = (from: number, step: 1 | -1): number => {
        for (let i = from; i >= 0 && i < rows.length; i += step) if (isNodeRow(rows[i])) return i;
        return -1;
      };
      const go = (target: number): void => {
        if (target >= 0) {
          event.preventDefault();
          moveTo(target);
        }
      };

      if ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu') {
        event.preventDefault();
        openMenu(node);
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          go(nodeIndexes(index + 1, 1));
          return;
        case 'ArrowUp':
          go(nodeIndexes(index - 1, -1));
          return;
        case 'Home':
          go(nodeIndexes(0, 1));
          return;
        case 'End':
          go(nodeIndexes(rows.length - 1, -1));
          return;
        case 'PageDown':
          go(nodeIndexes(Math.min(rows.length - 1, index + pageSize()), -1));
          return;
        case 'PageUp':
          go(nodeIndexes(Math.max(0, index - pageSize()), 1));
          return;
        case 'ArrowRight':
          event.preventDefault();
          if (event.shiftKey) expandLoaded(node);
          else if (hasChildren && !row.isExpanded) toggle(node, true);
          else if (row.isExpanded) {
            // While children are still loading the next row is a placeholder; stay put rather than skip past it.
            const next = rows[index + 1];
            if (isNodeRow(next) && next.level === row.level + 1) go(index + 1);
          }
          return;
        case 'ArrowLeft':
          event.preventDefault();
          if (hasChildren && row.isExpanded) toggle(node, false);
          else if (row.parentId) go(rows.findIndex((r) => r.key === row.parentId));
          return;
        case 'Enter':
          event.preventDefault();
          open(node);
          return;
        case ' ':
          event.preventDefault();
          if (hasChildren) toggle(node);
          return;
        case '*':
          event.preventDefault();
          rows.forEach((r) => {
            if (isNodeRow(r) && r.parentId === row.parentId && r.node.hasChildren && !r.isExpanded)
              toggle(r.node, true);
          });
          return;
        case 'F5':
          event.preventDefault();
          refresh(node);
          return;
        case 'F2':
          event.preventDefault();
          edit(node);
          return;
        case '/':
          event.preventDefault();
          focusSearch();
          return;
        default:
          break;
      }

      // Type-ahead: jump to the next row whose name starts with what was typed.
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const now = Date.now();
        const state = typeAheadRef.current;
        state.text = now - state.at > TYPE_AHEAD_RESET_MS ? event.key : state.text + event.key;
        state.at = now;
        const needle = state.text.toLowerCase();
        const start = state.text.length === 1 ? index + 1 : index;
        for (let step = 0; step < rows.length; step++) {
          const candidate = rows[(start + step) % rows.length];
          if (isNodeRow(candidate) && candidate.node.name.toLowerCase().startsWith(needle)) {
            go((start + step) % rows.length);
            return;
          }
        }
      }
    },
    [rows, activeId, pageSize, moveTo, toggle, expandLoaded, open, openMenu, refresh, edit, focusSearch]
  );
}

import type { TreeNodeType } from '@/types/Tree';

export type FlatNodeRow = {
  kind: 'node';
  key: string;
  node: TreeNodeType;
  level: number;
  posInSet: number;
  setSize: number;
  parentId: string | null;
  isExpanded: boolean;
};

export type FlatLoadingRow = { kind: 'loading'; key: string; level: number };

export type FlatRow = FlatNodeRow | FlatLoadingRow;

const matchesName = (node: TreeNodeType, term: string): boolean => node.name.toLowerCase().includes(term);

/** True when the node or any already-loaded descendant matches the search term. */
const matchesSearch = (node: TreeNodeType, term: string): boolean =>
  matchesName(node, term) || (node.children ?? []).some((child) => matchesSearch(child, term));

/**
 * Turns the lazily loaded tree into the visible list of rows. Only expanded, already-loaded folders
 * contribute rows; collapsed or unloaded folders are a single row, so nothing here triggers loading.
 */
export function flattenTree(
  root: TreeNodeType | null,
  expandedIds: ReadonlySet<string>,
  loadingIds: ReadonlySet<string>,
  searchTerm: string
): FlatRow[] {
  const term = searchTerm.trim().toLowerCase();
  const rows: FlatRow[] = [];

  const visit = (
    node: TreeNodeType,
    level: number,
    posInSet: number,
    setSize: number,
    parentId: string | null
  ): void => {
    const children = node.children ?? [];
    // A name match keeps every child (so "Tables" stays browsable); otherwise only the matching path.
    const visibleChildren =
      term && !matchesName(node, term) ? children.filter((c) => matchesSearch(c, term)) : children;
    const searchReveals = Boolean(term) && visibleChildren.length > 0 && children.some((c) => matchesSearch(c, term));
    const isExpanded = expandedIds.has(node.id) || searchReveals;

    rows.push({ kind: 'node', key: node.id, node, level, posInSet, setSize, parentId, isExpanded });

    if (!isExpanded) return;

    if (visibleChildren.length === 0 && loadingIds.has(node.id)) {
      rows.push({ kind: 'loading', key: `${node.id}:loading`, level: level + 1 });
      return;
    }

    visibleChildren.forEach((child, index) => visit(child, level + 1, index + 1, visibleChildren.length, node.id));
  };

  if (root && (!term || matchesSearch(root, term))) {
    visit(root, 0, 1, 1, null);
  }

  return rows;
}

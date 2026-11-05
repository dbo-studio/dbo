import type { NoSQLItem } from '@/api/nosql/types';

export type KeyRow = {
  key: string;
  label: string;
  depth: number;
  item?: NoSQLItem;
  folder?: string;
  /** Number of keys below a folder. */
  count?: number;
};

type Node = { name: string; path: string; item?: NoSQLItem; children: Map<string, Node>; count: number };

const byName = (a: Node, b: Node): number => a.name.localeCompare(b.name, undefined, { numeric: true });

/**
 * Builds a real tree from flat ids, so every key sits under its one folder no matter the order SCAN returned
 * them in. Folders sort first, then keys, both by name (numbers compared as numbers).
 */
export function buildKeyRows(items: NoSQLItem[], delimiter: string, expanded: Set<string>): KeyRow[] {
  if (!delimiter) {
    return items.map((item) => ({ key: item.id, label: item.id, depth: 0, item }));
  }

  const root: Node = { name: '', path: '', children: new Map(), count: 0 };

  for (const item of items) {
    const parts = item.id.split(delimiter);
    let node = root;

    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join(delimiter);
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, path, children: new Map(), count: 0 };
        node.children.set(part, child);
      }
      child.count += 1;
      node = child;
    });

    node.item = item;
  }

  const rows: KeyRow[] = [];

  const walk = (node: Node, depth: number): void => {
    const kids = [...node.children.values()];
    const folders = kids.filter((k) => k.children.size > 0).sort(byName);
    const leaves = kids.filter((k) => k.children.size === 0).sort(byName);

    for (const f of folders) {
      // A key that is also a prefix of other keys shows as its own row next to its folder.
      if (f.item) rows.push({ key: f.item.id, label: f.name, depth, item: f.item });
      rows.push({ key: `f:${f.path}`, label: f.name, depth, folder: f.path, count: f.count - (f.item ? 1 : 0) });
      if (expanded.has(f.path)) walk(f, depth + 1);
    }

    for (const leaf of leaves) {
      rows.push({ key: leaf.item?.id ?? leaf.path, label: leaf.name, depth, item: leaf.item });
    }
  };

  walk(root, 0);

  return rows;
}

import type { TreeSearchResultType } from '@/api/tree/types';
import type { TreeNodeType } from '@/types/Tree';

/**
 * Adds search hits (and the folders leading to them) to the loaded tree without dropping anything already
 * loaded. Only the nodes along each hit's path are copied; the store's tree is never mutated.
 */
export function mergeSearchResults(tree: TreeNodeType | null, results: TreeSearchResultType[]): TreeNodeType | null {
  if (results.length === 0) return tree;

  let root = tree ?? results[0].path[0] ?? null;
  if (!root) return tree;

  const insert = (node: TreeNodeType, chain: TreeNodeType[]): TreeNodeType => {
    if (chain.length === 0) return node;
    const [next, ...rest] = chain;
    const children = node.children ?? [];
    const index = children.findIndex((child) => child.id === next.id);
    const existing = index >= 0 ? children[index] : { ...next, children: [] };
    const updated = insert(existing, rest);
    if (updated === existing && index >= 0) return node;

    const nextChildren =
      index >= 0 ? children.map((child, i) => (i === index ? updated : child)) : [...children, updated];
    return { ...node, children: nextChildren };
  };

  for (const { node, path } of results) {
    const [first, ...below] = path;
    if (!first || first.id !== root.id) continue;
    root = insert(root, [...below, node]);
  }

  return root;
}

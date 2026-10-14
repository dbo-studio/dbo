import api from '@/api';
import { useCurrentConnection } from './useCurrentConnection';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { TreeNodeType } from '@/types/Tree';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

const findNode = (node: TreeNodeType, id: string): TreeNodeType | null => {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
};

type TreeLevel = {
  node: TreeNodeType | null;
  loading: boolean;
  error: boolean;
};

/**
 * One level of the object tree for the mobile drill-down. Children are fetched lazily and written
 * back into the shared tree store, so desktop reloads and the mobile view stay in sync.
 * `nodeId` undefined means the connection's root node.
 */
export const useTreeLevel = (nodeId?: string): TreeLevel => {
  const currentConnection = useCurrentConnection();
  const connectionId = currentConnection?.id;
  const tree = useTreeStore((state) => (connectionId ? (state.tree[connectionId] ?? null) : null));
  const treeLoading = useTreeStore((state) => state.isLoading);
  const treeError = useTreeStore((state) => state.treeError);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const setNodeChildren = useTreeStore((state) => state.setNodeChildren);
  const addLoadedParentId = useTreeStore((state) => state.addLoadedParentId);

  const node = tree ? (nodeId ? findNode(tree, nodeId) : tree) : null;
  const needsChildren = Boolean(node?.hasChildren && (node.children?.length ?? 0) === 0);

  useEffect(() => {
    if (!tree && !treeLoading && !treeError && connectionId) {
      reloadTree(true).catch(() => undefined);
    }
  }, [tree, treeLoading, treeError, connectionId, reloadTree]);

  const targetId = node?.id;
  const children = useQuery({
    queryKey: ['mobileTreeChildren', connectionId, targetId],
    enabled: needsChildren && Boolean(targetId && connectionId),
    queryFn: async (): Promise<TreeNodeType[]> => {
      const parentId = targetId as string;
      addLoadedParentId(parentId);
      const result = await api.tree.getTree({ parentId, connectionId: connectionId ?? 0, fromCache: true });
      const nodes = result?.children ?? [];
      setNodeChildren(parentId, nodes);
      return nodes;
    }
  });

  return {
    node,
    loading: treeLoading || children.isFetching,
    error: Boolean(treeError) || children.isError
  };
};

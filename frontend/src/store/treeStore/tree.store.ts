import api from '@/api';
import { getTree } from '@/api/tree';
import type { TreeNodeType } from '@/api/tree/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { TreeStore } from './types';

const getCurrentConnection = (): ConnectionType | undefined => {
  const connectionStore = useConnectionStore.getState();
  return connectionStore.connections?.find((connection) => connection.isActive);
};

export const useTreeStore = create<TreeStore>()(
  devtools(
    persist(
      (set, get) => ({
        tree: {},
        expandedNodes: {},
        loadedParentIds: {},
        isLoading: false,
        treeError: undefined,

        setTree: (tree: TreeNodeType | null): void => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return;

          set((state) => ({
            tree: { ...state.tree, [currentConnection.id]: tree }
          }));
        },

        getTree: (): TreeNodeType | null => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return null;

          return get().tree[currentConnection.id] || null;
        },

        expandNode: (nodeId: string): void => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return;

          set((state) => ({
            expandedNodes: {
              ...state.expandedNodes,
              [currentConnection.id]: [...(state.expandedNodes[currentConnection.id] || []), nodeId]
            }
          }));
        },

        collapseNode: (nodeId: string): void => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return;

          set((state) => {
            const connectionId = currentConnection.id;
            const currentExpandedNodes = state.expandedNodes[connectionId] || [];
            const currentLoadedParents = state.loadedParentIds[connectionId] || [];

            // Function to recursively find all child node IDs
            const getAllChildIds = (node: TreeNodeType): string[] => {
              let childIds: string[] = [];
              if (node.children?.length) {
                for (const child of node.children) {
                  childIds.push(child.id);
                  childIds = [...childIds, ...getAllChildIds(child)];
                }
              }
              return childIds;
            };

            // Get the tree to find all children of the collapsed node
            const tree = state.tree[connectionId];
            if (!tree) return state;

            // Find the node being collapsed
            const findNode = (node: TreeNodeType): TreeNodeType | null => {
              if (node.id === nodeId) return node;
              for (const child of node.children || []) {
                const found = findNode(child);
                if (found) return found;
              }
              return null;
            };

            const nodeToCollapse = findNode(tree);
            if (!nodeToCollapse) return state;

            // Get all child IDs to remove
            const childIdsToRemove = getAllChildIds(nodeToCollapse);

            return {
              expandedNodes: {
                ...state.expandedNodes,
                [connectionId]: currentExpandedNodes.filter((id) => id !== nodeId && !childIdsToRemove.includes(id))
              },
              loadedParentIds: {
                ...state.loadedParentIds,
                [connectionId]: currentLoadedParents.filter((id) => id !== nodeId && !childIdsToRemove.includes(id))
              }
            };
          });
        },

        isNodeExpanded: (nodeId: string): boolean => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return false;

          return get().expandedNodes[currentConnection.id]?.includes(nodeId) || false;
        },

        addLoadedParentId: (parentId: string): void => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return;

          set((state) => ({
            loadedParentIds: {
              ...state.loadedParentIds,
              [currentConnection.id]: [...(state.loadedParentIds[currentConnection.id] || []), parentId]
            }
          }));
        },

        getLoadedParentIds: (): string[] => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return [];

          return get().loadedParentIds[currentConnection.id] || [];
        },

        setNodeChildren: (nodeId: string, children: TreeNodeType[]): void => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return;

          set((state) => {
            const currentTree = state.tree[currentConnection.id];
            if (!currentTree) return state;

            const updateNodeChildren = (node: TreeNodeType): TreeNodeType => {
              if (node.id === nodeId) {
                return { ...node, children };
              }

              if (node.children.length === 0) {
                return node;
              }

              return {
                ...node,
                children: node.children.map(updateNodeChildren)
              };
            };

            return {
              tree: {
                ...state.tree,
                [currentConnection.id]: updateNodeChildren(currentTree)
              }
            };
          });
        },

        reloadTree: async (): Promise<void> => {
          const currentConnection = getCurrentConnection();
          if (!currentConnection) return;

          set({ isLoading: true });

          try {
            const treeData = await getTree({
              parentId: null,
              connectionId: currentConnection.id || 0
            });

            get().setTree(treeData);

            const loadedParentIds = get().getLoadedParentIds();

            for (const parentId of loadedParentIds) {
              try {
                const childrenData = await api.tree.getTree({
                  parentId,
                  connectionId: currentConnection.id || 0
                });

                if (childrenData?.children) {
                  get().setNodeChildren(parentId, childrenData.children);
                }
              } catch (childError) {
                console.error(`Failed to reload children for node ${parentId}:`, childError);
              }
            }

            set({ isLoading: false, treeError: undefined });
          } catch (error) {
            console.error('Failed to reload tree:', error);
            set({ isLoading: false, treeError: error as Error });
          }
        }
      }),
      {
        name: 'tree'
      }
    ),
    {
      name: 'tree'
    }
  )
);

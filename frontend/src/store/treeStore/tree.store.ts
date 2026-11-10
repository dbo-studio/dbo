import api from '@/api';
import { getTree } from '@/api/tree';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { TreeNodeType } from '@/types/Tree';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { TreeStore } from './types';

const getCurrentConnectionId = (): number | undefined => {
  const connectionStore = useConnectionStore.getState();
  return connectionStore.currentConnectionId ? Number(connectionStore.currentConnectionId) : undefined;
};

export const useTreeStore: UseBoundStore<StoreApi<TreeStore>> = create<TreeStore>()(
  devtools(
    persist(
      (set, get) => ({
        tree: {},
        expandedNodes: {},
        loadedParentIds: {},
        focusedNodeId: {},
        pinnedNodes: {},
        isLoading: false,
        treeError: undefined,

        pinNodes: (nodes: TreeNodeType[]): void => {
          const connection = getCurrentConnectionId();
          if (!connection) return;
          set((state) => {
            const current = state.pinnedNodes[connection] ?? [];
            const added = nodes
              .filter((node) => !current.some((p) => p.id === node.id))
              .map((node) => ({ ...node, children: [] }));
            return { pinnedNodes: { ...state.pinnedNodes, [connection]: [...current, ...added] } };
          });
        },

        unpinNodes: (nodeIds: string[]): void => {
          const connection = getCurrentConnectionId();
          if (!connection) return;
          set((state) => ({
            pinnedNodes: {
              ...state.pinnedNodes,
              [connection]: (state.pinnedNodes[connection] ?? []).filter((n) => !nodeIds.includes(n.id))
            }
          }));
        },

        // Node ids end with the object name, so a rename keeps the pin by rewriting that suffix.
        renamePinned: (nodeId: string, oldName: string, newName: string): void => {
          const connection = getCurrentConnectionId();
          if (!connection || !nodeId.endsWith(oldName)) return;
          const newId = nodeId.slice(0, -oldName.length) + newName;
          set((state) => ({
            pinnedNodes: {
              ...state.pinnedNodes,
              [connection]: (state.pinnedNodes[connection] ?? []).map((n) =>
                n.id === nodeId ? { ...n, id: newId, name: newName } : n
              )
            }
          }));
        },

        setTree: (tree: TreeNodeType | null): void => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return;

          set({ tree: { ...get().tree, [currentConnection]: tree } }, undefined, 'setTree');
        },

        getTree: (): TreeNodeType | null => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return null;

          return get().tree[currentConnection] || null;
        },

        expandNode: (nodeId: string): void => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return;

          set(
            {
              expandedNodes: {
                ...get().expandedNodes,
                [currentConnection]: [...(get().expandedNodes[currentConnection] || []), nodeId]
              }
            },
            undefined,
            'expandNode'
          );
        },

        // Collapsing only hides the node: descendants keep their expanded state (restored on re-expand, like VS Code)
        // and stay registered for reload, so a tree refresh never silently drops already-opened folders.
        collapseNode: (nodeId: string): void => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return;

          set(
            (state) => ({
              expandedNodes: {
                ...state.expandedNodes,
                [currentConnection]: (state.expandedNodes[currentConnection] || []).filter((id) => id !== nodeId)
              }
            }),
            undefined,
            'collapseNode'
          );
        },

        isNodeExpanded: (nodeId: string): boolean => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return false;

          return get().expandedNodes[currentConnection]?.includes(nodeId) || false;
        },

        setFocusedNodeId: (nodeId: string | undefined): void => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return;

          set(
            {
              focusedNodeId: {
                ...get().focusedNodeId,
                [currentConnection]: nodeId
              }
            },
            undefined,
            'setFocusedNodeId'
          );
        },

        getFocusedNodeId: (): string | undefined => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return undefined;

          return get().focusedNodeId[currentConnection];
        },

        clearFocusedNodeIdForConnection: (connectionId: string | number): void => {
          const key = String(connectionId);
          if (!(key in get().focusedNodeId)) return;

          const next = { ...get().focusedNodeId };
          delete next[key];
          set({ focusedNodeId: next }, undefined, 'clearFocusedNodeIdForConnection');
        },

        addLoadedParentId: (parentId: string): void => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return;

          set((state) => {
            const loaded = state.loadedParentIds[currentConnection] || [];
            if (loaded.includes(parentId)) return state;

            return {
              loadedParentIds: {
                ...state.loadedParentIds,
                [currentConnection]: [...loaded, parentId]
              }
            };
          });
        },

        getLoadedParentIds: (): string[] => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return [];

          return get().loadedParentIds[currentConnection] || [];
        },

        setNodeChildren: (nodeId: string, children: TreeNodeType[]): void => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return;

          const currentTree = get().tree[currentConnection];
          if (!currentTree) return;

          const updateNodeChildren = (node: TreeNodeType): TreeNodeType => {
            if (node.id === nodeId) {
              return { ...node, children };
            }

            if (!node.children?.length) {
              return node;
            }

            return {
              ...node,
              children: node.children.map(updateNodeChildren)
            };
          };

          set(
            {
              tree: {
                ...get().tree,
                [currentConnection]: updateNodeChildren(currentTree)
              }
            },
            undefined,
            'setNodeChildren'
          );
        },

        reloadTree: async (fromCache: boolean): Promise<void> => {
          const currentConnection = getCurrentConnectionId();
          if (!currentConnection) return;

          set({ isLoading: true });

          try {
            const treeData = await getTree({
              parentId: null,
              connectionId: currentConnection || 0,
              fromCache
            });

            if (!treeData) {
              set({ isLoading: false, treeError: undefined });
              return;
            }

            get().setTree(treeData);

            const loadedParentIds = get().getLoadedParentIds();

            for (const parentId of loadedParentIds) {
              try {
                const childrenData = await api.tree.getTree({
                  parentId,
                  connectionId: currentConnection || 0,
                  fromCache
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
        },
        toggleIsLoading(isLoading: boolean): void {
          set({ isLoading });
        },
        reset: (): void => {
          set(
            {
              tree: {},
              expandedNodes: {},
              loadedParentIds: {},
              focusedNodeId: {},
              isLoading: false,
              treeError: undefined
            },
            undefined,
            'reset'
          );
        }
      }),
      {
        name: 'tree',
        skipHydration: true,
        partialize: (state) => ({
          expandedNodes: state.expandedNodes,
          loadedParentIds: state.loadedParentIds,
          focusedNodeId: state.focusedNodeId,
          pinnedNodes: state.pinnedNodes
        })
      }
    ),
    {
      name: 'tree'
    }
  )
);

import api from '@/api';
import { getTree } from '@/api/tree';
import type { TreeNodeType } from '@/api/tree/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { TreeStore } from './types';

export const useTreeStore = create<TreeStore>()(
  devtools(
    persist(
      (set, get) => ({
        tree: null,
        expandedNodes: [],
        loadedParentIds: [],
        isLoading: false,
        treeError: undefined,

        setTree: (tree: TreeNodeType | null): void => {
          set({ tree });
        },
        getTree: (): TreeNodeType | null => {
          return get().tree;
        },
        expandNode: (nodeId: string): void => {
          const expandedNodes = get().expandedNodes;
          expandedNodes.push(nodeId);

          set({ expandedNodes });
        },
        collapseNode: (nodeId: string): void => {
          const expandedNodes = get().expandedNodes;
          expandedNodes.splice(expandedNodes.indexOf(nodeId), 1);

          set({ expandedNodes });
        },
        isNodeExpanded: (nodeId: string): boolean => {
          return get().expandedNodes.includes(nodeId);
        },
        addLoadedParentId: (parentId: string): void => {
          const loadedParentIds = get().loadedParentIds;
          loadedParentIds.push(parentId);

          set({ loadedParentIds });
        },
        getLoadedParentIds: (): string[] => {
          return get().loadedParentIds;
        },
        setNodeChildren: (nodeId: string, children: TreeNodeType[]): void =>
          set((state) => {
            if (!state.tree) return { tree: null };

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
              tree: updateNodeChildren(state.tree)
            };
          }),

        reloadTree: async (): Promise<void> => {
          const connectionStore = useConnectionStore.getState();
          const currentConnection = connectionStore.connections?.find((connection) => connection.isActive);

          if (!currentConnection) return;

          set({ isLoading: true });

          try {
            const treeData = await getTree({
              parentId: null,
              connectionId: currentConnection.id || 0
            });

            set({ tree: treeData });

            const loadedParentIds = Array.from(get().loadedParentIds);

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
    )
  )
);

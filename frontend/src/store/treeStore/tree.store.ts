import api from '@/api';
import { getTree } from '@/api/tree';
import type { TreeNodeType } from '@/api/tree/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TreeStore } from './types';

export const useTreeStore = create<TreeStore>()(
  devtools(
    (set, get) => ({
      tree: null,
      expandedNodes: new Set<string>(),
      loadedParentIds: new Set<string>(),
      isLoading: false,

      setTree: (tree) => set({ tree }),

      getTree: () => get().tree,

      expandNode: (nodeId) =>
        set((state) => {
          const newExpandedNodes = new Set(state.expandedNodes);
          newExpandedNodes.add(nodeId);
          return { expandedNodes: newExpandedNodes };
        }),

      collapseNode: (nodeId) =>
        set((state) => {
          const newExpandedNodes = new Set(state.expandedNodes);
          newExpandedNodes.delete(nodeId);
          return { expandedNodes: newExpandedNodes };
        }),

      isNodeExpanded: (nodeId) => get().expandedNodes.has(nodeId),

      addLoadedParentId: (parentId) =>
        set((state) => {
          const newLoadedParentIds = new Set(state.loadedParentIds);
          newLoadedParentIds.add(parentId);
          return { loadedParentIds: newLoadedParentIds };
        }),

      getLoadedParentIds: () => get().loadedParentIds,

      setNodeChildren: (nodeId, children) =>
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

      reloadTree: async () => {
        const connectionStore = useConnectionStore.getState();
        const currentConnection = connectionStore.currentConnection;

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

          set({ isLoading: false });
        } catch (error) {
          console.error('Failed to reload tree:', error);
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'tree'
    }
  )
);

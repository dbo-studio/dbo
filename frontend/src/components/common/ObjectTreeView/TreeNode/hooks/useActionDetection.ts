import api from '@/api';
import type { TreeNodeType } from '@/api/tree/types';
import { TabMode } from '@/core/enums';
import { useCopyToClipboard, useCurrentConnection, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useActionDetection = (
  expandNode: (event: React.MouseEvent, focus?: boolean) => Promise<void>
): {
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => Promise<void>;
} => {
  const queryClient = useQueryClient();
  const confirmModal = useConfirmModalStore();
  const currentConnection = useCurrentConnection();

  const addTab = useTabStore((state) => state.addTab);
  const addObjectTab = useTabStore((state) => state.addObjectTab);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const reloadTree = useTreeStore((state) => state.reloadTree);

  const [copy] = useCopyToClipboard();

  const { mutateAsync: executeActionMutation, isPending: pendingExecuteAction } = useMutation({
    mutationFn: api.tree.executeAction,
    onSuccess: async (_, variables): Promise<void> => {
      const selectedTab = useSelectedTab();
      queryClient.invalidateQueries({
        queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, selectedTab?.options?.action, variables.nodeId]
      });
      await reloadTree();
    },
    onError: (error): void => {
      console.error('🚀 ~ actionDetection:', error);
    }
  });

  const actionDetection = useCallback(
    async (event: React.MouseEvent, node: TreeNodeType) => {
      if (!node.action) {
        await expandNode(event, false);
        return;
      }

      switch (node.action.type) {
        case 'tab': {
          switch (node.action.params.path) {
            case 'object': {
              const tab = addObjectTab(node.action.title, node.id, node.action.name, TabMode.Object);
              updateSelectedTab(tab);
              break;
            }
            case 'object-detail': {
              const tab = addObjectTab(node.action.title, node.id, node.action.name, TabMode.ObjectDetail);
              updateSelectedTab(tab);
              break;
            }
            case 'data': {
              const tab = addTab(node.action.params.table, node.id, node.action.params.editable);
              updateSelectedTab(tab);
              break;
            }
          }
          break;
        }
        case 'action': {
          if (!currentConnection) return;

          confirmModal.danger(
            `Confirm ${node.action.title}`,
            `Are you sure you want to ${node.action.title} ${node.name}?`,
            async () => {
              if (pendingExecuteAction) {
                return;
              }

              try {
                const selectedTab = useSelectedTab();
                await executeActionMutation({
                  nodeId: node.id,
                  action: node.action.name,
                  connectionId: currentConnection.id,
                  data: {
                    [selectedTab?.id ?? '']: {
                      [node.id]: {}
                    }
                  }
                });

                toast.success(locales.action_executed_successfully);
              } catch (error) {}
            }
          );
          break;
        }
        case 'command': {
          if (node.action.name === 'copyName') {
            try {
              await copy(node.name);
              toast.success(locales.copied);
            } catch (error) {
              console.log('🚀 ~ handleCopy ~ error:', error);
            }
          }

          if (node.action.name === 'refresh') {
            await reloadTree();
          }

          break;
        }
      }
    },
    [confirmModal, currentConnection?.id, expandNode, executeActionMutation, pendingExecuteAction, reloadTree]
  );

  return { actionDetection };
};

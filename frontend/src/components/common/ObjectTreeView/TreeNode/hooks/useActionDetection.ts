import api from '@/api';
import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { TreeNodeType } from '@/types/Tree';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

export const useActionDetection = (
  expandNode: (event: React.MouseEvent, focus?: boolean) => Promise<void>
): {
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => Promise<void>;
} => {
  const queryClient = useQueryClient();
  const confirmModal = useConfirmModalStore();
  const currentConnection = useCurrentConnection();

  const addDataTab = useTabStore((state) => state.addDataTab);
  const addObjectTab = useTabStore((state) => state.addObjectTab);
  const reloadTree = useTreeStore((state) => state.reloadTree);

  const [, copy] = useCopyToClipboard();

  const { mutateAsync: executeActionMutation, isPending: pendingExecuteAction } = useMutation({
    mutationFn: api.tree.executeAction,
    onSuccess: async (_, variables): Promise<void> => {
      const selectedTab = useTabStore.getState().selectedTab();
      queryClient.invalidateQueries({
        queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, selectedTab?.action, variables.nodeId]
      });
      await reloadTree(false);
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
              addObjectTab(node.action.title, node.id, node.action.name, TabMode.Object);
              break;
            }
            case 'object-detail': {
              addObjectTab(node.action.title, node.id, node.action.name, TabMode.ObjectDetail);
              break;
            }
            case 'data': {
              addDataTab(node.action.params.table as string, node.id, node.action.params.editable as boolean);
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
                const selectedTab = useTabStore.getState().selectedTab();
                await executeActionMutation({
                  nodeId: node.id,
                  action: node.action.name,
                  connectionId: currentConnection.id,
                  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
                  // @ts-ignore
                  data: {
                    [selectedTab?.id ?? '']: {
                      [node.id]: {}
                    }
                  }
                });

                toast.success(locales.action_executed_successfully);
              } catch (error) {
                console.debug('🚀 ~ actionDetection ~ error:', error);
              }
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
              console.debug('🚀 ~ handleCopy ~ error:', error);
            }
          }

          if (node.action.name === 'refresh') {
            await reloadTree(false);
          }

          break;
        }
      }
    },
    [confirmModal, currentConnection?.id, expandNode, executeActionMutation, pendingExecuteAction, reloadTree]
  );

  return { actionDetection };
};

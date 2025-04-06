import api from '@/api';
import type { TreeNodeType } from '@/api/tree/types';
import { TabMode } from '@/core/enums';
import { useCopyToClipboard, useCurrentConnection } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
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
  const navigate = useNavigate();
  const selectedTab = useSelectedTab();

  const { addTab, addObjectTab } = useTabStore();
  const confirmModal = useConfirmModalStore();
  const currentConnection = useCurrentConnection();
  const { reloadTree } = useTreeStore();
  const [copy] = useCopyToClipboard();

  const { mutateAsync: executeActionMutation, isPending: pendingExecuteAction } = useMutation({
    mutationFn: api.tree.executeAction,
    onSuccess: async (_, variables): Promise<void> => {
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
              const tab = addObjectTab(node.id, node.action.name, TabMode.Object);
              navigate({
                route: node.action.params.path,
                tabId: tab.id
              });
              break;
            }
            case 'object-detail': {
              const tab = addObjectTab(node.id, node.action.name, TabMode.ObjectDetail);
              navigate({
                route: node.action.params.path,
                tabId: tab.id
              });
              break;
            }
            case 'data': {
              const tab = addTab(node.action.params.table, node.id, node.action.params.path);
              navigate({
                route: node.action.params.path,
                tabId: tab.id
              });
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
    [
      addObjectTab,
      addTab,
      confirmModal,
      currentConnection?.id,
      expandNode,
      navigate,
      executeActionMutation,
      pendingExecuteAction,
      selectedTab?.id,
      reloadTree
    ]
  );

  return { actionDetection };
};

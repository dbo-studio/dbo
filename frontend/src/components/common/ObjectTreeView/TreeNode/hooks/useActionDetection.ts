import api from '@/api';
import type { TreeNodeType } from '@/api/tree/types';
import { TabMode } from '@/core/enums';
import useNavigate from '@/hooks/useNavigate.hook';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

export const useActionDetection = (expandNode: (event: React.MouseEvent, focus?: boolean) => Promise<void>) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addTab, addObjectTab, getSelectedTab } = useTabStore();
  const confirmModal = useConfirmModalStore();
  const { currentConnection } = useConnectionStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);

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
          if (!currentConnection) {
            toast.error('No connection selected');
            return;
          }

          confirmModal.danger(
            `Confirm ${node.action.title}`,
            `Are you sure you want to ${node.action.title} ${node.name}?`,
            async () => {
              try {
                await api.tree.executeAction({
                  nodeId: node.id,
                  action: node.action.name,
                  connectionId: String(currentConnection.id),
                  tabId: node.id,
                  data: {}
                });

                await queryClient.invalidateQueries({
                  queryKey: ['tabFields', currentConnection.id, selectedTab?.id, selectedTab?.options?.action, node.id]
                });

                await queryClient.invalidateQueries({
                  queryKey: ['tree', currentConnection.id]
                });

                toast.success('Action executed successfully');
              } catch (error) {
                console.error('🚀 ~ error:', error);
                toast.error('Failed to execute action');
              }
            }
          );
          break;
        }
      }
    },
    [addObjectTab, addTab, confirmModal, currentConnection?.id, expandNode, navigate]
  );

  return { actionDetection };
};

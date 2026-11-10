import api from '@/api';
import { openBottomPanel } from '@/core/bottomPanel';
import { useCloseOverlaySidebar } from '@/components/common/Boards/useDashboardCommands';
import { TabMode } from '@/core/enums';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useDataStore } from '@/store/dataStore/data.store';
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
  renameNode: (node: TreeNodeType, newName: string) => Promise<boolean>;
  dropNodes: (nodes: TreeNodeType[]) => void;
} => {
  const queryClient = useQueryClient();
  const confirmDanger = useConfirmModalStore((state) => state.danger);
  const currentConnection = useCurrentConnection();
  const closeLeftSidebar = useCloseOverlaySidebar();

  const addDataTab = useTabStore((state) => state.addDataTab);
  const addObjectTab = useTabStore((state) => state.addObjectTab);
  const addBrowseTab = useTabStore((state) => state.addBrowseTab);
  const addToolTab = useTabStore((state) => state.addToolTab);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const setFocusedNodeId = useTreeStore((state) => state.setFocusedNodeId);

  const [, copy] = useCopyToClipboard();

  const { mutateAsync: executeActionMutation, isPending: pendingExecuteAction } = useMutation({
    mutationFn: api.tree.executeAction
  });

  const dropActionOf = (node: TreeNodeType): string | undefined =>
    node.contextMenu?.find((a) => a.name.startsWith('drop'))?.name;

  const renameNode = useCallback(
    async (node: TreeNodeType, newName: string): Promise<boolean> => {
      if (!currentConnection) return false;
      try {
        const result = await withSafeModeRetry((confirmed) =>
          executeActionMutation({
            nodeId: node.id,
            action: 'rename',
            connectionId: currentConnection.id,
            confirmed,
            data: { name: newName }
          })
        );
        if (result === undefined) return false;
        useTreeStore.getState().renamePinned(node.id, node.name, newName);
        await reloadTree(false);
        toast.success(locales.action_executed_successfully);
        return true;
      } catch {
        toast.error(locales.action_failed);
        return false;
      }
    },
    [currentConnection, executeActionMutation, reloadTree]
  );

  const dropNodes = useCallback(
    (nodes: TreeNodeType[]): void => {
      if (!currentConnection) return;
      confirmDanger(
        locales.tree_drop_selected.replace('{n}', String(nodes.length)),
        locales.tree_drop_selected_confirm.replace('{n}', String(nodes.length)),
        () => {
          void (async (): Promise<void> => {
            let failed = false;
            for (const node of nodes) {
              const action = dropActionOf(node);
              if (!action) continue;
              try {
                const result = await withSafeModeRetry((confirmed) =>
                  executeActionMutation({
                    nodeId: node.id,
                    action,
                    connectionId: currentConnection.id,
                    confirmed,
                    data: { general: {} }
                  })
                );
                // Declined safe-mode prompt: stop instead of asking once per object.
                if (result === undefined) break;
                useTreeStore.getState().unpinNodes([node.id]);
              } catch {
                failed = true;
              }
            }
            await reloadTree(false);
            if (failed) toast.error(locales.action_failed);
            else toast.success(locales.action_executed_successfully);
          })();
        }
      );
    },
    [confirmDanger, currentConnection, executeActionMutation, reloadTree]
  );

  const runTreeAction = useCallback(
    async (node: TreeNodeType): Promise<void> => {
      if (!currentConnection || pendingExecuteAction) {
        return;
      }

      try {
        const selectedTab = useTabStore.getState().selectedTab();
        const result = await withSafeModeRetry((confirmed) =>
          executeActionMutation({
            nodeId: node.id,
            action: node.action.name,
            connectionId: currentConnection.id,
            confirmed,
            // Drop table (and other tree actions) only emit SQL for the general tab.
            data: {
              general: {}
            }
          })
        );
        if (result === undefined) {
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, selectedTab?.action, node.id]
        });

        await reloadTree(false);

        toast.success(locales.action_executed_successfully);
      } catch {
        toast.error(locales.action_failed);
      }
    },
    [currentConnection, pendingExecuteAction, executeActionMutation, queryClient, reloadTree]
  );

  const actionDetection = useCallback(
    async (event: React.MouseEvent, node: TreeNodeType) => {
      if (!node.action) {
        await expandNode(event, false);
        return;
      }

      switch (node.action.type) {
        case 'tab': {
          setFocusedNodeId(node.id);
          switch (node.action.params.path) {
            case 'object': {
              addObjectTab(node.action.title, node.id, node.action.name, TabMode.Object);
              break;
            }
            case 'object-detail': {
              addObjectTab(node.action.title, node.id, node.action.name, TabMode.ObjectDetail);
              break;
            }
            case 'tool': {
              // The CLI is the bottom-panel terminal, not a tab; other tools (Pub/Sub) are tabs.
              if (node.action.params.tool === 'cli') {
                openBottomPanel('terminal');
              } else {
                addToolTab(node.action.params.tool as string, node.action.title);
              }
              break;
            }
            case 'browse': {
              addBrowseTab(node.name, node.id);
              break;
            }
            case 'query': {
              // A server insight or a statement template: open the editor with it, and run it unless run is false.
              const store = useDataStore.getState();
              const query = node.action.params.query as string;
              if (node.action.params.run === false) store.insertQueryInEditor(query);
              else store.runQueryInEditor(query);
              break;
            }
            case 'data': {
              addDataTab(node.action.params.table as string, node.id, node.action.params.editable as boolean);
              break;
            }
          }
          closeLeftSidebar();
          break;
        }
        case 'action': {
          if (!currentConnection) return;

          const needsGenericConfirm = !currentConnection.safeMode || currentConnection.safeMode === 'silent';

          if (needsGenericConfirm) {
            confirmDanger(
              `Confirm ${node.action.title}`,
              `Are you sure you want to ${node.action.title} ${node.name}?`,
              () => {
                void runTreeAction(node);
              }
            );
          } else {
            void runTreeAction(node);
          }
          break;
        }
        case 'command': {
          if (node.action.name === 'copyName') {
            try {
              await copy(node.name);
              toast.success(locales.copied);
            } catch {
              // clipboard unavailable
            }
          }

          if (node.action.name === 'refresh') {
            await reloadTree(false);
          }

          break;
        }
      }
    },
    [
      expandNode,
      addObjectTab,
      addBrowseTab,
      addToolTab,
      addDataTab,
      closeLeftSidebar,
      currentConnection,
      confirmDanger,
      runTreeAction,
      reloadTree,
      copy,
      setFocusedNodeId
    ]
  );

  return { actionDetection, renameNode, dropNodes };
};

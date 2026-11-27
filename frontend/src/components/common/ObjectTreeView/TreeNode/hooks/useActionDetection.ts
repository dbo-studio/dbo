import api from '@/api';
import type { SaveObjectRequestType } from '@/api/tree/types';
import { openBottomPanel } from '@/core/bottomPanel';
import { useCloseOverlaySidebar } from '@/components/common/Boards/useDashboardCommands';
import { isMongoDriver } from '@/core/db/connectionAliases';
import { TabMode } from '@/core/enums';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { CollectionPanel } from '@/types/Tab';
import { TreeNodeType } from '@/types/Tree';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

async function executeTreeAction(params: SaveObjectRequestType): Promise<unknown> {
  if (params.action === 'dropCollection') {
    await api.nosql.dropCollection(params.connectionId, params.nodeId, params.confirmed);
    return true;
  }

  return api.tree.executeAction(params);
}

function closeCollectionTab(nodeId: string, connectionId: number): void {
  const { tabs, removeTab } = useTabStore.getState();
  const tab = tabs.find(
    (tab) => tab.mode === TabMode.Browse && tab.nodeId === nodeId && matchConnectionId(tab.connectionId, connectionId)
  );
  if (tab) removeTab(tab.id);
}

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
  const addCollectionTab = useTabStore((state) => state.addCollectionTab);
  const addToolTab = useTabStore((state) => state.addToolTab);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const setFocusedNodeId = useTreeStore((state) => state.setFocusedNodeId);

  const [, copy] = useCopyToClipboard();

  const { mutateAsync: executeActionMutation, isPending: pendingExecuteAction } = useMutation({
    mutationFn: executeTreeAction
  });

  const dropActionOf = (node: TreeNodeType): string | undefined =>
    node.contextMenu?.find((a) => a.name.startsWith('drop'))?.name;

  const renameNode = useCallback(
    async (node: TreeNodeType, newName: string): Promise<boolean> => {
      if (!currentConnection) return false;
      const connectionId = currentConnection.id;
      const isMongoCollection = isMongoDriver(currentConnection.type) && node.type === 'table';
      try {
        const result = await withSafeModeRetry(
          (confirmed) =>
            isMongoCollection
              ? api.nosql.renameCollection(connectionId, node.id, newName, confirmed)
              : executeActionMutation({
                  nodeId: node.id,
                  action: 'rename',
                  connectionId,
                  confirmed,
                  data: { name: newName }
                }),
          connectionId
        );
        if (result === undefined) return false;
        const savedName =
          isMongoCollection && typeof result === 'string' ? result.slice(result.indexOf('/') + 1) : newName;
        useTreeStore.getState().renamePinned(node.id, node.name, savedName, connectionId);
        if (isMongoCollection) closeCollectionTab(node.id, connectionId);
        if (Number(useConnectionStore.getState().currentConnectionId) === connectionId) await reloadTree(false);
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
            let dropped = false;
            for (const node of nodes) {
              const action = dropActionOf(node);
              if (!action) continue;
              try {
                const result = await withSafeModeRetry(
                  (confirmed) =>
                    executeActionMutation({
                      nodeId: node.id,
                      action,
                      connectionId: currentConnection.id,
                      confirmed,
                      data: { general: {} }
                    }),
                  currentConnection.id
                );
                // Declined safe-mode prompt: stop instead of asking once per object.
                if (result === undefined) break;
                dropped = true;
                useTreeStore.getState().unpinNodes([node.id], currentConnection.id);
                if (action === 'dropCollection') closeCollectionTab(node.id, currentConnection.id);
              } catch {
                failed = true;
              }
            }
            if (dropped) await reloadTree(false);
            if (failed) toast.error(locales.action_failed);
            else if (dropped) toast.success(locales.action_executed_successfully);
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
        const result = await withSafeModeRetry(
          (confirmed) =>
            executeActionMutation({
              nodeId: node.id,
              action: node.action.name,
              connectionId: currentConnection.id,
              confirmed,
              data: { general: {} }
            }),
          currentConnection.id
        );
        if (result === undefined) {
          return;
        }

        if (node.action.name === 'dropCollection') {
          useTreeStore.getState().unpinNodes([node.id], currentConnection.id);
          closeCollectionTab(node.id, currentConnection.id);
        } else {
          await queryClient.invalidateQueries({
            queryKey: ['tabFields', currentConnection.id, selectedTab?.id, selectedTab?.action, node.id]
          });
        }

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
              const { panel, containerId } = node.action.params as {
                panel?: CollectionPanel | 'documents';
                containerId?: string;
              };
              if (panel && containerId) {
                // A collection's sub-pages: Documents is its browse tab, the rest are tabs of their own.
                const collection = containerId.slice(containerId.indexOf('/') + 1);
                if (panel === 'documents') addBrowseTab(collection, containerId);
                else addCollectionTab(containerId, panel, `${node.name} · ${collection}`);
              } else {
                addBrowseTab(node.name, node.id);
              }
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
            const isCollectionDrop = node.action.name === 'dropCollection';
            confirmDanger(
              isCollectionDrop ? locales.nosql_drop_collection : `Confirm ${node.action.title}`,
              isCollectionDrop
                ? locales.nosql_drop_collection_confirm.replace('{name}', node.name)
                : `Are you sure you want to ${node.action.title} ${node.name}?`,
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
      addCollectionTab,
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

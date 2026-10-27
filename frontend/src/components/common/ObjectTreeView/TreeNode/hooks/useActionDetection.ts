import api from '@/api';
import { TabMode } from '@/core/enums';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import { contextScope } from '@/components/common/AiChatPanel/utils/contextScope';
import { useCurrentConnection } from '@/hooks';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useDashboardDialogStore } from '@/store/dashboardDialog/dashboardDialog.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { DashboardTabType, QuestionTabType, TabType } from '@/types/Tab';
import { TreeNodeType } from '@/types/Tree';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

const isDashboardTab = (tab: TabType): tab is DashboardTabType => tab.mode === TabMode.Dashboard;
const isQuestionTab = (tab: TabType): tab is QuestionTabType => tab.mode === TabMode.Question;

export const useActionDetection = (
  expandNode: (event: React.MouseEvent, focus?: boolean) => Promise<void>
): {
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => Promise<void>;
} => {
  const queryClient = useQueryClient();
  const confirmDanger = useConfirmModalStore((state) => state.danger);
  const currentConnection = useCurrentConnection();
  const { useSidebarOverlay } = useLayoutMode();
  const updateUI = useSettingStore((state) => state.updateUI);

  const addDataTab = useTabStore((state) => state.addDataTab);
  const addDashboardTab = useTabStore((state) => state.addDashboardTab);
  const addQuestionTab = useTabStore((state) => state.addQuestionTab);
  const addObjectTab = useTabStore((state) => state.addObjectTab);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const setFocusedNodeId = useTreeStore((state) => state.setFocusedNodeId);

  const [, copy] = useCopyToClipboard();

  const { mutateAsync: executeActionMutation, isPending: pendingExecuteAction } = useMutation({
    mutationFn: api.tree.executeAction
  });

  const closeLeftSidebar = useCallback((): void => {
    if (!useSidebarOverlay) {
      return;
    }

    const sidebar = useSettingStore.getState().ui.sidebar;
    if (!sidebar.showLeft) {
      return;
    }

    updateUI({ sidebar: { ...sidebar, showLeft: false } });
  }, [updateUI, useSidebarOverlay]);

  const runDashboardCommand = useCallback(
    async (name: string, params: Record<string, unknown>): Promise<void> => {
      const id = Number(params.dashboardId ?? params.questionId);
      const boardName = params.name as string;
      const dialog = useDashboardDialogStore.getState();
      const refresh = (): Promise<void> =>
        queryClient.invalidateQueries({ queryKey: ['dashboards'], refetchType: 'all' });
      const closeTabs = (match: (tab: TabType) => boolean): void => {
        const tabs = useTabStore.getState();
        tabs.getTabs().filter(match).forEach((tab) => tabs.removeTab(tab.id));
      };

      switch (name) {
        case 'newDashboard':
          dialog.openNew();
          break;
        case 'openDashboard':
          addDashboardTab({ id, name: boardName });
          closeLeftSidebar();
          break;
        case 'renameDashboard':
          dialog.openRename(id, boardName);
          break;
        case 'duplicateDashboard':
          try {
            await api.dashboard.duplicateDashboard(id);
            await refresh();
          } catch {
            toast.error(locales.action_failed);
          }
          break;
        case 'deleteDashboard':
          confirmDanger(
            locales.dashboard_delete_title,
            locales.dashboard_delete_confirm.replace('{name}', boardName),
            () => {
              void api.dashboard
                .deleteDashboard(id)
                .then(() => {
                  closeTabs((tab) => isDashboardTab(tab) && tab.dashboardId === id);
                  return refresh();
                })
                .catch(() => toast.error(locales.action_failed));
            }
          );
          break;
        case 'newReport':
          try {
            const scope = contextScope({}, currentConnection);
            const question = await api.question.createQuestion({
              connectionId: Number(currentConnection?.id),
              name: locales.question_untitled,
              sql: 'SELECT 1',
              chart: { type: 'table', y: [] },
              ...scope
            });
            await queryClient.invalidateQueries({ queryKey: ['questions'], refetchType: 'all' });
            addQuestionTab({ id: question.id, name: question.name });
            closeLeftSidebar();
          } catch {
            toast.error(locales.action_failed);
          }
          break;
        case 'openReport':
          addQuestionTab({ id, name: boardName });
          closeLeftSidebar();
          break;
        case 'deleteReport':
          confirmDanger(
            locales.question_delete_title,
            locales.question_delete_confirm.replace('{name}', boardName),
            () => {
              void api.question
                .deleteQuestion(id)
                .then(() => {
                  closeTabs((tab) => isQuestionTab(tab) && tab.questionId === id);
                  return Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['questions'], refetchType: 'all' }),
                    refresh()
                  ]);
                })
                .catch(() => toast.error(locales.action_failed));
            }
          );
          break;
      }
    },
    [addDashboardTab, addQuestionTab, closeLeftSidebar, confirmDanger, currentConnection, queryClient]
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
            case 'dashboard': {
              addDashboardTab({ id: Number(node.action.params.dashboardId), name: node.action.params.name as string });
              break;
            }
            case 'question': {
              addQuestionTab({ id: Number(node.action.params.questionId), name: node.action.params.name as string });
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
          if (/(Dashboard|Report)$/.test(node.action.name)) {
            await runDashboardCommand(node.action.name, node.action.params);
          }

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
      addDataTab,
      closeLeftSidebar,
      currentConnection,
      confirmDanger,
      runTreeAction,
      runDashboardCommand,
      addDashboardTab,
      addQuestionTab,
      reloadTree,
      copy,
      setFocusedNodeId
    ]
  );

  return { actionDetection };
};

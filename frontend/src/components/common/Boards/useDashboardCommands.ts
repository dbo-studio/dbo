import api from '@/api';
import { importBoard } from '@/components/common/AgentWorkspace/BoardView/boardJson';
import { contextScope } from '@/components/common/AiChatPanel/utils/contextScope';
import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useDashboardDialogStore } from '@/store/dashboardDialog/dashboardDialog.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DashboardTabType, QuestionTabType, TabType } from '@/types/Tab';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

export type DashboardCommand =
  | 'newDashboard'
  | 'importDashboard'
  | 'openDashboard'
  | 'renameDashboard'
  | 'duplicateDashboard'
  | 'deleteDashboard'
  | 'newReport'
  | 'openReport'
  | 'deleteReport';

export type DashboardCommandParams = { dashboardId?: number; questionId?: number; name?: string };

const isDashboardTab = (tab: TabType): tab is DashboardTabType => tab.mode === TabMode.Dashboard;
const isQuestionTab = (tab: TabType): tab is QuestionTabType => tab.mode === TabMode.Question;

/** Closes the sidebar after opening a tab, when the sidebar overlays the workspace (phones, narrow windows). */
export const useCloseOverlaySidebar = (): (() => void) => {
  const { useSidebarOverlay } = useLayoutMode();
  const updateUI = useSettingStore((state) => state.updateUI);

  return useCallback((): void => {
    if (!useSidebarOverlay) return;
    const sidebar = useSettingStore.getState().ui.sidebar;
    if (sidebar.showLeft) updateUI({ sidebar: { ...sidebar, showLeft: false } });
  }, [updateUI, useSidebarOverlay]);
};

/** Create, open, rename, duplicate, import and delete dashboards and reports of the current connection. */
export const useDashboardCommands = (): ((
  name: DashboardCommand,
  params?: DashboardCommandParams
) => Promise<void>) => {
  const queryClient = useQueryClient();
  const confirmDanger = useConfirmModalStore((state) => state.danger);
  const currentConnection = useCurrentConnection();
  const addDashboardTab = useTabStore((state) => state.addDashboardTab);
  const addQuestionTab = useTabStore((state) => state.addQuestionTab);
  const closeLeftSidebar = useCloseOverlaySidebar();

  return useCallback(
    async (name: DashboardCommand, params: DashboardCommandParams = {}): Promise<void> => {
      const id = Number(params.dashboardId ?? params.questionId);
      const boardName = params.name ?? '';
      const dialog = useDashboardDialogStore.getState();
      const refresh = (): Promise<void> =>
        queryClient.invalidateQueries({ queryKey: ['dashboards'], refetchType: 'all' });
      const closeTabs = (match: (tab: TabType) => boolean): void => {
        const tabs = useTabStore.getState();
        tabs
          .getTabs()
          .filter(match)
          .forEach((tab) => tabs.removeTab(tab.id));
      };

      switch (name) {
        case 'newDashboard':
          dialog.openNew();
          break;
        case 'importDashboard': {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json,.json';
          input.onchange = async (): Promise<void> => {
            const file = input.files?.[0];
            if (!file || !currentConnection) return;
            try {
              const board = await importBoard(Number(currentConnection.id), await file.text());
              await Promise.all([
                refresh(),
                queryClient.invalidateQueries({ queryKey: ['questions'], refetchType: 'all' })
              ]);
              addDashboardTab({ id: board.id, name: board.name });
              toast.success(locales.dashboard_imported.replace('{name}', board.name));
            } catch {
              toast.error(locales.action_failed);
            }
          };
          input.click();
          break;
        }
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
};

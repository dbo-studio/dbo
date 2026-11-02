import type { DashboardType } from '@/api/dashboard/types';
import type { QuestionType } from '@/api/question/types';
import locales from '@/locales';
import type { TreeNodeActionType, TreeNodeType } from '@/types/Tree';

/** Ids of the virtual nodes; they live in the app DB, so the driver tree never sees them. */
export const DASHBOARD_GROUP_PREFIX = 'dashboards:';
export const DASHBOARD_NODE_PREFIX = 'dashboard:';
export const REPORT_GROUP_PREFIX = 'reports:';
export const REPORT_NODE_PREFIX = 'report:';

export const isDashboardGroup = (node: TreeNodeType): boolean => 
  node.id.startsWith(DASHBOARD_GROUP_PREFIX) || node.id.startsWith(REPORT_GROUP_PREFIX);

const command = (title: string, name: string, params: Record<string, unknown> = {}): TreeNodeActionType => ({
  title,
  name,
  type: 'command',
  params
});

function dashboardNode(board: DashboardType): TreeNodeType {
  const params = { dashboardId: board.id, name: board.name };

  return {
    id: `${DASHBOARD_NODE_PREFIX}${board.id}`,
    name: board.name,
    type: 'dashboard',
    icon: 'layout',
    hasChildren: false,
    children: [],
    action: { title: locales.dashboard_open, name: 'openDashboard', type: 'tab', params: { path: 'dashboard', ...params } },
    contextMenu: [
      command(locales.dashboard_open, 'openDashboard', params),
      command(locales.dashboard_rename, 'renameDashboard', params),
      command(locales.dashboard_duplicate, 'duplicateDashboard', params),
      command(locales.dashboard_delete, 'deleteDashboard', params)
    ]
  };
}

/** The "Dashboards" folder shown under a connection, with one child per saved dashboard. */
export function buildDashboardGroup(connectionId: number, boards: DashboardType[]): TreeNodeType {
  return {
    id: `${DASHBOARD_GROUP_PREFIX}${connectionId}`,
    name: locales.dashboards,
    type: 'dashboards',
    icon: 'layout',
    hasChildren: true,
    children: boards.map(dashboardNode),
    action: undefined as unknown as TreeNodeActionType,
    contextMenu: [command(locales.dashboard_new, 'newDashboard'), command(locales.dashboard_import, 'importDashboard')]
  };
}

function reportNode(question: QuestionType): TreeNodeType {
  const params = { questionId: question.id, name: question.name };

  return {
    id: `${REPORT_NODE_PREFIX}${question.id}`,
    name: question.name,
    type: 'report',
    icon: 'chart',
    hasChildren: false,
    children: [],
    action: { title: locales.dashboard_open, name: 'openReport', type: 'tab', params: { path: 'question', ...params } },
    contextMenu: [command(locales.question_open, 'openReport', params), command(locales.question_delete, 'deleteReport', params)]
  };
}

/** The "Reports" folder shown under a connection, with one child per saved report. */
export function buildReportGroup(connectionId: number, questions: QuestionType[]): TreeNodeType {
  return {
    id: `${REPORT_GROUP_PREFIX}${connectionId}`,
    name: locales.reports,
    type: 'reports',
    icon: 'chart',
    hasChildren: true,
    children: questions.map(reportNode),
    action: undefined as unknown as TreeNodeActionType,
    contextMenu: [command(locales.question_new, 'newReport')]
  };
}

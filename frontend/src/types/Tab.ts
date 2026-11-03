import type { TabMode } from '@/core/enums';
import type { EditorContextSource } from '@/core/db';
import type { RowType } from './Data';

export type SortType = {
  index: string;
  column: string;
  operator: string;
  isActive: boolean;
};

export type FilterType = {
  index: string;
  column: string;
  operator: string;
  value: string | number;
  next: string;
  isActive: boolean;
};

export type TabType =
  | DataTabType
  | EditorTabType
  | ObjectTabType
  | DiagramTabType
  | DashboardTabType
  | QuestionTabType
  | SettingsTabType
  | BackupTabType;

type BaseTab = {
  id: string;
  connectionId: string | number;
  nodeId: string;
  action?: string;
  mode: TabMode;
  /** Split view pane. Undefined = primary (left) pane. */
  pane?: 1;
};

export type DataTabType = BaseTab & {
  name: string;
  table?: string;
  inlineQuery: string;
  pagination?: TabDataPagination;
  showQuery?: boolean;
  showColumns?: boolean;
  showFilters?: boolean;
  showSorts?: boolean;
  sorts?: SortType[];
  filters?: FilterType[];
  columns?: string[];
  editable: boolean;
};

export type EditorTabType = BaseTab & {
  name: string;
  database: string;
  schema: string;
  /** When true, autofill must not overwrite database/schema. */
  contextLocked?: boolean;
  contextSource?: EditorContextSource;
  pagination?: TabDataPagination;
};

export type ObjectTabType = BaseTab & {
  name: string;
  objectTabId: string | null;
};

export type DiagramTabType = BaseTab & {
  name: string;
  database: string;
  schema: string;
  focusTable?: string;
};

export type DashboardTabType = BaseTab & {
  name: string;
  mode: TabMode.Dashboard;
  dashboardId: number;
};

export type QuestionTabType = BaseTab & {
  name: string;
  mode: TabMode.Question;
  questionId: number;
};

export type SettingsTabType = BaseTab & {
  name: string;
  mode: TabMode.Settings;
  section: number;
  aiTab?: 'providers' | 'mcp';
  query?: string;
  highlightId?: string;
};

export type BackupSection = 'backups' | 'restore' | 'schedules' | 'destinations' | 'notifications' | 'tools';

/** Global singleton like Settings; `targetConnectionId`/`database` pick what the Backups section shows. */
export type BackupTabType = BaseTab & {
  name: string;
  mode: TabMode.Backup;
  section: BackupSection;
  targetConnectionId?: string | number;
  database?: string;
  /** Schedules section: the schedule shown, or 'new' for the create form. */
  scheduleId?: number | 'new';
};

export type EditedRow = {
  dboIndex: number;
  conditions: object;
  old: RowType;
  new: RowType;
};

export type TabDataPagination = {
  page: number;
  limit: number;
};

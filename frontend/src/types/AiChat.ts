import type { SchemaOp } from '@/core/diagram/types';

export type AiChatType = {
  id: number;
  title: string;
  pinned?: boolean;
  /** Explorer context saved with the chat; restored as chips when the chat is reopened. */
  context?: { database?: string; schema?: string; tables?: string[]; views?: string[] };
  createdAt: string;
  updatedAt?: string;
  messages: AiMessageType[];
};

export type AiMessageType = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  /** LLM that wrote an assistant message; absent for user messages and older chats. */
  model?: string;
  /** Rating the user sent for this answer in this session; never stored or restored. */
  feedback?: 'up' | 'down';
  language: 'sql' | 'go' | 'js' | 'python' | 'json' | 'yaml' | 'text';
  /** tool / diagram_diff / plan carry a JSON payload (see agent trace types below). */
  type: 'code' | 'explanation' | AiTraceMessageKind;
  isNew?: boolean;
  thinking?: {
    content: string;
    durationMs: number;
  };
};

export type AiChatMode = 'ask' | 'agent';

export type AiTraceMessageKind = 'tool' | 'diagram_diff' | 'plan';

export type AiToolStatus = 'running' | 'done' | 'error' | 'blocked' | 'cancelled';

export type AiToolTrace = {
  id: string;
  name: string;
  args?: string;
  status: AiToolStatus;
  result?: string;
  error?: string;
  durationMs?: number;
};

export type SchemaChangeColumn = {
  name: string;
  type: string;
  notNull?: boolean;
  primary?: boolean;
  default?: string;
};

export type SchemaChangeOp = {
  op:
    | 'write'
    | 'create_database'
    | 'create_schema'
    | 'create_table'
    | 'add_column'
    | 'alter_column'
    | 'drop_column'
    | 'add_index'
    | 'add_foreign_key';
  table: string;
  /** create_database / create_schema: the new name. */
  name?: string;
  /** write: the INSERT, UPDATE or DELETE, and how many rows it changed when previewed. */
  sql?: string;
  affectedRows?: number;
  columns?: SchemaChangeColumn[];
  column?: SchemaChangeColumn;
  columnName?: string;
  indexColumns?: string[];
  unique?: boolean;
  fkColumns?: string[];
  refTable?: string;
  refColumns?: string[];
  onDelete?: string;
};

/** What a data change would do right now: the rows it changes and a sample of them. */
export type WritePreview = {
  sql: string;
  affectedRows: number;
  columns: string[];
  rows: Record<string, unknown>[];
  sampleQuery?: string;
};

/** The live definition of a table a changeset changes. */
export type TableStructure = {
  columns: { name: string; dataType: string; notNull: boolean; default?: string; isPrimaryKey: boolean }[];
  indexes: { name: string; columns: string[]; unique: boolean }[];
  foreignKeys: { name: string; columns: string[]; refTable: string; refColumns: string[]; onDelete?: string }[];
};

export type AiChangesetOpStatus = 'pending' | 'accepted' | 'rejected' | 'applied' | 'failed';

export type AiChangesetOp = SchemaChangeOp & {
  position: number;
  status: AiChangesetOpStatus;
  /** Tree node id of the op's table. */
  tableId: string;
  /** Why the op failed to apply. */
  error?: string;
};

/** A schema proposal stored on the server with the user's review state per op. */
export type AiChangeset = {
  id: number;
  chatId: number;
  connectionId: number;
  database?: string;
  schema?: string;
  ops: AiChangesetOp[];
  diagramOps: SchemaOp[];
  /** SQL that takes back the applied ops, when it can be derived. */
  undoSql: string[];
};

export type AiPlanStep = {
  title: string;
  status: 'pending' | 'in_progress' | 'done';
};

export type AiAgentItem =
  | { kind: 'tool'; trace: AiToolTrace }
  | { kind: 'diagram_diff'; changesetId: number }
  | { kind: 'plan'; steps: AiPlanStep[] };

export type AiContextType = {
  input: string;
  database: string | undefined;
  schema: string | undefined;
  tables: string[];
  views: string[];
  selectedQuery?: string;
  querySnippet?: string;
  queryResultSummary?: string;
  objectDefinition?: string;
};

export type AiBridgeRequest = {
  message?: string;
  autoSend?: boolean;
  contextPatch?: Partial<AiContextType>;
};

export type AiSelectionAction = 'explain' | 'optimize' | 'fix';

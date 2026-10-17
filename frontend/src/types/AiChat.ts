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
  /** User rating of an assistant answer; only the newest answer of a chat can be rated. */
  feedback?: 'up' | 'down';
  language: 'sql' | 'go' | 'js' | 'python' | 'json' | 'yaml' | 'text';
  /** tool / diagram_diff / permission carry a JSON payload (see agent trace types below). */
  type: 'code' | 'explanation' | AiTraceMessageKind;
  isNew?: boolean;
  thinking?: {
    content: string;
    durationMs: number;
  };
};

export type AiChatMode = 'ask' | 'agent';

export type AiTraceMessageKind = 'tool' | 'diagram_diff' | 'permission';

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
  op: 'create_table' | 'add_column' | 'add_foreign_key';
  table: string;
  columns?: SchemaChangeColumn[];
  column?: SchemaChangeColumn;
  fkColumns?: string[];
  refTable?: string;
  refColumns?: string[];
  onDelete?: string;
};

export type AiDiagramDiff = {
  changesetId: string;
  connectionId: number;
  database?: string;
  schema?: string;
  ops: SchemaChangeOp[];
  diagramOps: SchemaOp[];
  /** Set by the server once the user has reviewed the proposal. */
  decision?: 'applied' | 'rejected';
};

export type AiPermissionRequest = {
  requestId: string;
  connectionId: number;
  database?: string;
  schema?: string;
  sql: string;
  class: string;
  /** Set by the server once the user has confirmed or rejected the request. */
  decision?: 'confirmed' | 'rejected';
};

export type AiAgentItem =
  | { kind: 'tool'; trace: AiToolTrace }
  | { kind: 'diagram_diff'; diff: AiDiagramDiff }
  | { kind: 'permission'; request: AiPermissionRequest };

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

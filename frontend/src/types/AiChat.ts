export type AiChatType = {
  id: number;
  title: string;
  createdAt: string;
  messages: AiMessageType[];
};

export type AiMessageType = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  language: 'sql' | 'go' | 'js' | 'python' | 'json' | 'yaml' | 'text';
  type: 'code' | 'explanation';
  isNew?: boolean;
  thinking?: {
    content: string;
    durationMs: number;
  };
};

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

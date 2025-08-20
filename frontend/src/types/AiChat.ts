export type AiChatType = {
  id: number;
  title: string;
  providerId: number;
  model: string;
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
};

export type AiContextType = {
  input: string;
  database: string | undefined;
  schema: string | undefined;
  tables: string[];
  views: string[];
};

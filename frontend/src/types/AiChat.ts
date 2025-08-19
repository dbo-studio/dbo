export type AiChatType = {
  id: number;
  title: string;
  createdAt: string;
  messages: AiMessageType[];
};

export type AiMessageType = {
  id: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type AiContextType = {
  input: string;
  database: string | undefined;
  schema: string | undefined;
  tables: string[];
  views: string[];
};
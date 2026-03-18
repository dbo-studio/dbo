import type { AiChatType, AiMessageType, AutoCompleteType } from '@/types';

export type AIChatPanelProps = {
  context?: string;
};

export type ChatItemProps = {
  chat: AiChatType;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
};

export type ChatTextInputProps = {
  loading: boolean;
  onSend: () => void;
};

export type ChatContextProps = {
  autocomplete: AutoCompleteType;
};

export type ChatContextModalItemProps = {
  name: string;
  type: ContextItemType;
  isActive: boolean;
  onClick: (name: string, type: ContextItemType) => void;
};

export type ChatContextItemProps = {
  name: string;
  type: 'tables' | 'views' | 'database' | 'schema';
  onClick: () => void;
};

export type ContextItemType = 'tables' | 'views' | 'database' | 'schema';

export type ExplanationMessageProps = {
  message: AiMessageType;
};

export type CodeMessageProps = {
  message: AiMessageType;
};

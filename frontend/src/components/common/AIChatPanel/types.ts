import type { AiChatType, AiMessageType, AutoCompleteType } from '@/types';

export type AIChatPanelProps = {
  context?: string;
};

export type ChatProps = {
  chats: AiChatType[];
  currentChat: AiChatType | undefined;
  onChatChange: (chat: AiChatType) => void;
};

export type ChatItemProps = {
  chat: AiChatType;
  selected: boolean;
  onClick: () => void;
};

export type ChatTextInputProps = {
  onSend: () => void;
};

export type ChatContextModalProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactElement;
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
  onClick: () => void;
};

export type ContextItemType = 'tables' | 'views';

export type ExplanationMessageProps = {
  message: AiMessageType;
};

export type MessagesProps = {
  messages: AiMessageType[];
  onLoadMore?: () => Promise<void>;
};

export type CodeMessageProps = {
  message: AiMessageType;
};

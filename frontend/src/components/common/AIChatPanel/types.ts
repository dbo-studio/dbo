import type { AiChatType, AutoCompleteType } from '@/types';

export type AIChatPanelProps = {
  context?: string;
};

export type ChatProps = {
  currentChat: AiChatType | undefined;
  onChatChange: (chat: AiChatType) => void;
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
  type: ContextItemType;
  onClick: (name: string, type: ContextItemType) => void;
};

export type ContextItemType = 'tables' | 'views';

import type { AutoCompleteType } from '@/types';
import type { AIChat } from '@/types/AiChat';

export type AIChatPanelProps = {
  context?: string;
};

export type ChatProps = {
  currentChat: AIChat | undefined;
  onChatChange: (chat: AIChat) => void;
};

export type AddChatProps = {
  onChatAdd: (chat: AIChat) => void;
};

export type ChatTextInputProps = {
  value: string;
  onChange: (value: string) => void;
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
  contextItems: Record<ContextItemType, string[]>;
  onContextChange: (contextItems: Record<ContextItemType, string[]>) => void;
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

export type ContextItemType = 'databases' | 'schemas' | 'tables' | 'views';

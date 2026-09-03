import type { AiChatType, AiMessageType, AutoCompleteType } from '@/types';

export type AIChatPanelProps = {
  context?: string;
};

export type ChatsProps = {
  chats: AiChatType[];
  currentChat: AiChatType | undefined;
  onChatChange: (chat: AiChatType) => void;
  onChatDelete: (chat: AiChatType) => void;
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
  autocomplete?: AutoCompleteType;
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
  type: 'tables' | 'views' | 'database' | 'schema';
  onClick: () => void;
};

export type ContextItemType = 'tables' | 'views' | 'database' | 'schema';

export type ExplanationMessageProps = {
  message: AiMessageType;
};

export type MessagesProps = {
  messages: AiMessageType[];
  loading: boolean;
  onLoadMore?: () => void;
  onSelectPrompt?: (prompt: string) => void;
  onRetry?: () => void;
};

export type CodeMessageProps = {
  message: AiMessageType;
};

export type ChatBoxProps = {
  onSend: () => void;
  onCancel: () => void;
  loading: boolean;
  autocomplete?: AutoCompleteType;
};

export type StreamingPreviewProps = {
  content: string;
  statusLabel?: string;
  blockType?: string;
  isStreaming?: boolean;
};

export type ChatErrorMessageProps = {
  message: string;
  onRetry: () => void;
};

export type ChatEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
};

export type ThinkingMessageProps = {
  content: string;
  durationMs?: number;
  isLive?: boolean;
  defaultCollapsed?: boolean;
};

export type ChatMarkdownProps = {
  content: string;
  isStreaming?: boolean;
  showCursor?: boolean;
};

export type ChatDataTableProps = {
  rows: Record<string, unknown>[];
};

export type StreamingMarkdownProps = {
  content: string;
  isStreaming?: boolean;
  showCursor?: boolean;
};

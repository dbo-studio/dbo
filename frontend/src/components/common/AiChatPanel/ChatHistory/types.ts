import { AiChatType } from '@/types';

export type ChatHistoryItemProps = {
  item: AiChatType;
  onClick: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onExport: () => void;
  selected?: boolean;
};

export type ChatHistoryProps = {
  /** `menu`: history button with a dropdown (side panel). `list`: always-visible list (agent workspace sessions). */
  variant?: 'menu' | 'list';
};

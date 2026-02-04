import { AiChatType } from '@/types';

export type ChatHistoryItemProps = {
  item: AiChatType;
  onClick: () => void;
  onDelete: () => void;
};

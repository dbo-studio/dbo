import type { ContextMenuType } from '@/types';
import type { HistoryType } from '@/types/History';

export type HistoryItemProps = {
  history: HistoryType;
  selected: boolean;
  onClick: () => void;
  context: (e: React.MouseEvent<HTMLDivElement>) => void;
};

export type HistoryContextMenuProps = {
  history: HistoryType;
  contextMenu: ContextMenuType;
  onClose: () => void;
};

export type HistoryItemStyledProps = {
  selected?: boolean;
};

import { ContextMenuType } from '@/types';
import { HistoryType } from '@/types/History';

export type HistoryItemProps = {
  history: HistoryType;
  selected: boolean;
  onClick: () => void;
};

export type HistoryContextMenuProps = {
  history: HistoryType;
  contextMenu: ContextMenuType;
  onClose: () => void;
};

export type HistoryItemStyledProps = {
  selected?: boolean;
};

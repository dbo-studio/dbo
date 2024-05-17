import { ContextMenuType } from '@/src/types';
import { HistoryType } from '@/src/types/History';

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

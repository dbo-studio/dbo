import { ContextMenuType, SavedQueryType } from '@/src/types';

export type SavedQueryItemProps = {
  query: SavedQueryType;
  selected: boolean;
  onClick: () => void;
  onChange: (query: SavedQueryType) => void;
  onDelete: () => void;
};

export type SavedQueryContextMenuProps = {
  query: SavedQueryType;
  contextMenu: ContextMenuType;
  onClose: () => void;
  onDelete: () => void;
  onChange: () => void;
};

export type SavedQueryItemStyledProps = {
  selected?: boolean;
};

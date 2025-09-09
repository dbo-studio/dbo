import type { ContextMenuType, SavedQueryType } from '@/types';

export type SavedQueryItemProps = {
  query: SavedQueryType;
  selected: boolean;
  onClick: () => void;
  onChange: () => void;
  context: (event: React.MouseEvent) => void;
  isEditMode: boolean;
  onEditMode: (isEditMode: boolean) => void;
};

export type SavedQueryContextMenuProps = {
  query: SavedQueryType;
  contextMenu: ContextMenuType;
  onClose: () => void;
  onChange: () => Promise<void>;
  onEditMode: (isEditMode: boolean) => void;
};

export type SavedQueryItemStyledProps = {
  selected?: boolean;
};

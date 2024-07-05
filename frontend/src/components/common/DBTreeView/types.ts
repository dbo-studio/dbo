import { ContextMenuType } from '@/types';

export type TablesTreeViewItemProps = {
  table: string;
  onClick: () => void;
};

export type TablesTreeViewItemContextMenuProps = {
  table: string;
  contextMenu: ContextMenuType;
  onClose: () => void;
};

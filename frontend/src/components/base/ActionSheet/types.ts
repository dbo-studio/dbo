import type { MenuType } from '../ContextMenu/types';

export type ActionSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Same menu model the desktop context menus use; nested children are flattened. */
  menu: MenuType[];
};

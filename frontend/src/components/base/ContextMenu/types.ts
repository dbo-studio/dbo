import type { ContextMenuType } from '@/types';
import type { IconTypes } from '../CustomIcon/types';

export type ContextMenuProps = {
  contextMenu: ContextMenuType;
  onClose: () => void;
  menu: MenuType[];
};

export type MenuType = {
  name: string;
  action: () => void;
  icon?: keyof typeof IconTypes;
  closeBeforeAction?: boolean;
  closeAfterAction?: boolean;
};

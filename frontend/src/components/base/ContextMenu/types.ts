import type { IconTypes } from '../CustomIcon/types';

export interface MenuType {
  name: string;
  action?: () => void;
  icon?: keyof typeof IconTypes;
  disabled?: boolean;
  closeBeforeAction?: boolean;
  closeAfterAction?: boolean;
  children?: MenuType[];
  separator?: boolean;
}

export interface ContextMenuProps {
  menu: MenuType[];
  contextMenu: {
    mouseX: number;
    mouseY: number;
  } | null;
  onClose: () => void;
}

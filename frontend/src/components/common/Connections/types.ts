import type { ConnectionType, ContextMenuType } from '@/types';

export type ConnectionItemStyledProps = {
  selected?: boolean;
};

export type ConnectionItemProps = {
  connection: ConnectionType;
  selected?: boolean;
  onClick: () => void;
};

export type ConnectionContextMenuProps = {
  connection: ConnectionType;
  contextMenu: ContextMenuType;
  onClose: () => void;
};

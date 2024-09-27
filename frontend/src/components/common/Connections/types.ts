import type { ConnectionType, ContextMenuType } from '@/types';
import type { Theme } from '@mui/material';

export type ConnectionItemStyledProps = {
  theme: Theme;
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

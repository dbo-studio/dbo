import { ConnectionType } from '@/src/types';
import { Theme } from '@mui/material';

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
  contextMenu: {
    mouseX: number;
    mouseY: number;
  } | null;
  onClose: () => void;
};

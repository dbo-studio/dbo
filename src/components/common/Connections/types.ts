import { ConnectionType } from '@/src/types';
import { Theme } from '@mui/material';
import { MouseEventHandler } from 'react';

export type ConnectionItemStyledProps = {
  theme: Theme;
  selected?: boolean;
};

export type ConnectionItemProps = {
  connection: ConnectionType;
  selected?: boolean;
  onClick: MouseEventHandler | undefined;
};

export type ConnectionContextMenuProps = {
  connection: ConnectionType;
  contextMenu: {
    mouseX: number;
    mouseY: number;
  } | null;
  onClose: () => void;
};

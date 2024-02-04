import { ConnectionType } from '@/src/types';
import { Theme } from '@mui/material';

export type ConnectionItemStyledProps = {
  theme: Theme;
  selected?: boolean;
};

export type ConnectionItemProps = {
  label: string;
  selected?: boolean;
  onClick: (c: ConnectionType) => void;
};

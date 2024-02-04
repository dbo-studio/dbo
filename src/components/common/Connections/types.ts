import { Theme } from '@mui/material';
import { MouseEventHandler } from 'react';

export type ConnectionItemStyledProps = {
  theme: Theme;
  selected?: boolean;
};

export type ConnectionItemProps = {
  label: string;
  selected?: boolean;
  onClick: MouseEventHandler | undefined;
};

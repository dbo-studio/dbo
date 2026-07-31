import type { BoxProps } from '@mui/material';
import type { CSSProperties, ReactNode } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

export type GridProps = BoxProps & {
  children: ReactNode;
  breakpointValues?: Partial<Record<Exclude<Breakpoint, 'xs'>, number>>;
  columns?: ResponsiveValue<number>;
  templateColumns?: ResponsiveValue<string>;
  autoRows?: ResponsiveValue<string>;
  autoFlow?: ResponsiveValue<CSSProperties['gridAutoFlow']>;
};

export type GridItemProps = BoxProps & {
  children: ReactNode;
  span?: ResponsiveValue<number | 'auto' | 'full'>;
  column?: ResponsiveValue<string>;
  row?: ResponsiveValue<string>;
};

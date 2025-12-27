import type React from 'react';
import type { MouseEventHandler } from 'react';

export interface ResizableBoxXProps {
  direction: 'rtl' | 'ltr';
  width: number;
  maxWidth?: number;
  children: React.ReactNode;
  onChange?: (width: number) => void;
}

export interface ResizableBoxYProps {
  direction: 'ttb' | 'btt';
  height: number;
  maxHeight?: number;
  children: React.ReactNode;
  onChange?: (height: number) => void;
}

export type ResizableToggleStyledProps = {
  direction: 'rtl' | 'ltr' | 'ttb' | 'btt';
};

export type ResizableToggleProps = {
  direction: 'rtl' | 'ltr' | 'ttb' | 'btt';
  onMouseDown: MouseEventHandler | undefined;
};

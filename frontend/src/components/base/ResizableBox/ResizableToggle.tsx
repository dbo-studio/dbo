import type { JSX } from 'react';
import { ResizableToggleStyled } from './ResizableToggle.styled';
import type { ResizableToggleProps } from './types';

export default function ResizableToggle({ onMouseDown, onDoubleClick, direction }: ResizableToggleProps): JSX.Element {
  return (
    <ResizableToggleStyled
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      direction={direction}
      data-testid='resize-handle'
    />
  );
}

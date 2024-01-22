import { ResizableToggleStyled } from './ResizableToggle.styled';
import { ResizableToggleProps } from './types';

export default function ResizableToggle({ onMouseDown, direction }: ResizableToggleProps) {
  return <ResizableToggleStyled onMouseDown={onMouseDown} direction={direction} />;
}

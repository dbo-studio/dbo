import { styled } from '@mui/material';
import { ResizableToggleStyledProps } from './types';

export const ResizableToggleStyled = styled('div')<ResizableToggleStyledProps>(({ theme, direction }) => ({
  position: 'absolute',
  width: direction == 'ttb' || direction == 'btt' ? '100%' : '10px',
  height: direction == 'ttb' || direction == 'btt' ? '10px' : '100%',
  background: 'transparent',
  cursor: direction == 'ttb' || direction == 'btt' ? 'row-resize' : 'col-resize',
  left: direction == 'ltr' ? 0 : 'unset',
  right: direction == 'rtl' ? 0 : 'unset',
  top: direction == 'btt' ? 0 : 'unset',
  bottom: direction == 'ttb' ? 0 : 'unset',
  zIndex: 2
}));

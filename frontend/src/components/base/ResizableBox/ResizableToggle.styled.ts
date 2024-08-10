import { styled } from '@mui/material';
import { ResizableToggleStyledProps } from './types';

export const ResizableToggleStyled = styled('div')<ResizableToggleStyledProps>(({ theme, direction }) => ({
  position: 'absolute',
  width: direction == 'ttb' || direction == 'btt' ? '100%' : '5px',
  height: direction == 'ttb' || direction == 'btt' ? '5px' : '100%',
  background: 'transparent',
  cursor: direction == 'ttb' || direction == 'btt' ? 'row-resize' : 'col-resize',
  left: direction == 'ltr' ? 0 : 'unset',
  right: direction == 'rtl' ? 0 : 'unset',
  top: direction == 'btt' ? 0 : 'unset',
  bottom: direction == 'ttb' ? 0 : 'unset',
  zIndex: 2,
  transition: 'opacity 0.2s linear',
  transitionDelay: '0.3s',
  opacity: 0,
  ':hover': {
    background: theme.palette.info.main,
    opacity: 1
  }
}));

import { Button, styled } from '@mui/material';
import type { ImportButtonStyledProps } from '../types';

export const VisuallyHiddenInputStyled = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1
});

export const ImportButtonStyled = styled(Button)<ImportButtonStyledProps>(({ theme, drag }) => ({
  border: '1px solid #000',
  width: '100%',
  height: '50px',
  justifyContent: 'center',
  alignItems: 'center',
  display: 'flex',
  borderStyle: 'dashed',
  background: drag ? theme.palette.action.hover : theme.palette.background.default,
  borderColor: drag ? theme.palette.primary.main : theme.palette.divider,
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    background: theme.palette.action.hover,
    borderColor: theme.palette.primary.main
  }
}));

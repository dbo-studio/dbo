import { alpha, Box, styled } from '@mui/material';
import type { MenuPanelItemStyledProps } from '../../types';

export const MenuPanelItemStyled = styled(Box)<MenuPanelItemStyledProps>(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
  marginBottom: theme.spacing(0.25),
  cursor: 'pointer',
  borderRadius: 4,
  borderLeft: `3px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
  background: selected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  color: selected ? theme.palette.text.primary : theme.palette.text.text,
  '&:hover': {
    background: selected ? alpha(theme.palette.primary.main, 0.14) : alpha(theme.palette.action.hover, 0.6)
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1
  },
  h6: {
    color: 'inherit'
  },
  svg: {
    color: 'inherit',
    flexShrink: 0
  }
}));

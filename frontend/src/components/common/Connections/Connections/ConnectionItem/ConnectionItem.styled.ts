import { Box, styled } from '@mui/material';
import type { ConnectionItemStyledProps } from '../../types';

export const ConnectionItemStyled = styled(Box)<ConnectionItemStyledProps>(({ theme, selected }) => ({
  cursor: 'pointer',
  textAlign: 'center',
  position: 'relative',
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  maxHeight: '82px',
  ':hover': {
    background: theme.palette.background.paper
  },
  p: {
    color: selected ? theme.palette.text.primary : theme.palette.text.text
  }
}));

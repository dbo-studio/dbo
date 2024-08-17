import { Box, styled } from '@mui/material';
import { ConnectionItemStyledProps } from '../../types';

export const ConnectionItemStyled = styled(Box)<ConnectionItemStyledProps>(({ theme, selected }) => ({
  cursor: 'pointer',
  position: 'relative',
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  justifyContent: 'center',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'column',
  padding: theme.spacing(2),
  maxHeight: '82px',
  ':hover': {
    background: theme.palette.background.paper
  },
  p: {
    color: selected ? theme.palette.text.primary : theme.palette.text.text
  }
}));

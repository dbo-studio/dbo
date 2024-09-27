import { Box, styled } from '@mui/material';
import type { DesignTabItemStyledProps } from './types';

export const DesignTabWrapperStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flex: 1,
  overflow: 'auto',
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const DesignTabItemStyled = styled(Box)<DesignTabItemStyledProps>(({ theme, selected }) => ({
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: '6px 8px',
  p: {
    fontWeight: selected ? 'bold' : 'inherit'
  },
  ':hover': {
    p: {
      fontWeight: 'bold'
    }
  }
}));

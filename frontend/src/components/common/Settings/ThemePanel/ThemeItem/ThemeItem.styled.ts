import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import type { ThemeItemStyledProps } from '../../types';

export const ThemeItemStyled = styled(Box)<ThemeItemStyledProps>(({ theme, selected }) => ({
  borderRadius: variables.radius.medium,
  padding: '8px 16px',
  marginRight: '16px',
  border: selected ? `1px solid ${theme.palette.divider}` : 'none',
  img: {
    borderRadius: variables.radius.medium,
    width: 150,
    height: 93
  }
}));

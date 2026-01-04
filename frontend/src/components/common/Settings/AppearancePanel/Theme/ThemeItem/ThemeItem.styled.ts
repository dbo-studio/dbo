import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import { ThemeItemStyledProps } from '../../../types';

export const ThemeItemStyled = styled(Box)<ThemeItemStyledProps>(({ theme, selected }) => ({
  borderRadius: variables.radius.medium,
  padding: '8px 16px',
  marginRight: '16px',
  border: '1px solid transparent',
  borderColor: selected ? theme.palette.text.primary : 'transparent',
  cursor: 'pointer',
  ':hover': {
    borderColor: selected ? theme.palette.text.primary : theme.palette.divider,
    transition: 'border-color 0.2s ease-in-out'
  },
  img: {
    borderRadius: variables.radius.medium,
    width: 150,
    height: 93
  }
}));

import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import { ThemeItemStyledProps } from '../../../types';

export const ThemeItemStyled = styled(Box)<ThemeItemStyledProps>(({ theme, selected }) => ({
  borderRadius: variables.radius.medium,
  padding: '8px 16px',
  marginRight: '16px',
  border: '1px solid transparent',
  borderColor: selected ? theme.palette.primary.main : 'transparent',
  cursor: 'pointer',
  ':hover': {
    borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
    transition: 'border-color 0.2s ease-in-out'
  },
  img: {
    borderRadius: variables.radius.medium,
    width: 150,
    height: 93
  },
  // Phones: two previews share the row instead of overflowing it.
  [theme.breakpoints.down('sm')]: {
    flex: '1 1 0',
    minWidth: 0,
    marginRight: 0,
    padding: theme.spacing(1),
    img: {
      width: '100%',
      height: 'auto',
      aspectRatio: '150 / 93'
    }
  }
}));

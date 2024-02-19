import { variables } from '@/src/core/theme/variables';
import { Box, styled } from '@mui/material';
import { ConnectionItemStyledProps } from '../types';

export const ConnectionItemStyled = styled(Box)<ConnectionItemStyledProps>(({ theme, selected }) => ({
  borderRadius: variables.radius.medium,
  background: selected ? theme.palette.background.paper : 'unset',
  padding: theme.spacing(1),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
  border: '1px solid',
  borderColor: selected ? theme.palette.divider : 'transparent',
  transition: 'background-color 0.2s linear',
  ':hover': {
    transition: 'border-color 0.3s ease',
    border: `1px solid ${theme.palette.divider}`
  },
  cursor: 'pointer'
}));

export const ConnectionItemLogoStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  width: 40,
  height: 40,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: variables.radius.small,
  background: theme.palette.grey[200]
}));

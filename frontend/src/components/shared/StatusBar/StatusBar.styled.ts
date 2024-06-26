import { variables } from '@/core/theme/variables';
import { Box, Stack, styled } from '@mui/material';
import { StatusBarStylesProps } from './types';

export const StatusBarStyled = styled(Stack)<StatusBarStylesProps>(({ theme }) => ({
  background: theme.palette.background.default,
  width: '100%',
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: '4px 8px 0 8px'
}));

export const PaginationSettingStyled = styled(Box)(({ theme }) => ({
  background: theme.palette.background.default,
  borderRadius: variables.radius.medium,
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1)
}));

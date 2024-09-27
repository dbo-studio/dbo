import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import type { ConnectionBoxStyledProps } from './types';

export const ConnectionBoxStyled = styled(Box)<ConnectionBoxStyledProps>(({ theme, active }) => ({
  height: '32px',
  textAlign: 'center',
  borderRadius: variables.radius.medium,
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${theme.spacing(2)}`,
  border: `1px solid ${theme.palette.divider}`,
  h6: {
    color: active === 'true' ? theme.palette.text.success : theme.palette.text.subdued
  }
}));

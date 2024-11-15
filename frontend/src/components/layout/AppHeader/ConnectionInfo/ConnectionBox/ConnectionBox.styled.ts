import { variables } from '@/core/theme/variables.ts';
import { Box, styled } from '@mui/material';
import type { ConnectionBoxStyledProps } from '../types.ts';

export const ConnectionBoxStyled = styled(Box)<ConnectionBoxStyledProps>(({ theme, status }) => ({
  height: '32px',
  textAlign: 'center',
  borderRadius: variables.radius.medium,
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${theme.spacing(2)}`,
  border: `1px solid ${theme.palette.divider}`,
  justifyContent: 'space-between',
  background:
    (status === 'active' && theme.palette.background.success) ||
    (status === 'disable' && theme.palette.background.default) ||
    theme.palette.background.warning,
  h6: {
    color:
      (status === 'active' && theme.palette.text.success) ||
      (status === 'disable' && theme.palette.text.subdued) ||
      theme.palette.text.warning
  }
}));

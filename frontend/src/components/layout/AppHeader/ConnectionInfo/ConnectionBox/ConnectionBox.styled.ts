import { variables } from '@/core/theme/variables.ts';
import { Box, styled } from '@mui/material';
import type { ConnectionBoxStyledProps } from '../types.ts';

export const ConnectionBoxStyled = styled(Box)<ConnectionBoxStyledProps>(({ theme, status }) => ({
  minHeight: '24px',
  textAlign: 'center',
  borderRadius: variables.radius.medium,
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${theme.spacing(2)}`,
  border: `1px solid ${theme.palette.divider}`,
  justifyContent: 'space-between',
  background:
    (status === 'loading' && theme.palette.background.warning) ||
    (status === 'error' && theme.palette.background.danger) ||
    theme.palette.background.default,
  h6: {
    color:
      (status === 'loading' && theme.palette.text.warning) ||
      (status === 'error' && theme.palette.text.danger) ||
      theme.palette.text.text,
    fontFamily: 'JetBrainsMono-Bold',
    fontWeight: 'bold',
    fontSize: 12
  }
}));

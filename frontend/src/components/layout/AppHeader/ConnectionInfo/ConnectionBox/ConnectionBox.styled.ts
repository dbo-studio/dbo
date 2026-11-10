import { variables } from '@/core/theme/variables.ts';
import { Box, styled } from '@mui/material';
import type { ConnectionBoxStyledProps } from '../types.ts';

export const ConnectionBoxStyled = styled(Box)<ConnectionBoxStyledProps>(({ theme, status }) => ({
  height: 26,
  maxWidth: 520,
  margin: '0 auto',
  width: '100%',
  textAlign: 'center',
  borderRadius: variables.radius.medium,
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${theme.spacing(2)}`,
  boxSizing: 'border-box',
  border: `1px solid ${theme.palette.divider}`,
  justifyContent: 'space-between',
  overflow: 'hidden',
  background:
    (status === 'loading' && theme.palette.background.warning) ||
    (status === 'error' && theme.palette.background.danger) ||
    theme.palette.background.default,
  h6: {
    color:
      (status === 'loading' && theme.palette.text.warning) ||
      (status === 'error' && theme.palette.text.danger) ||
      theme.palette.text.text,
    // Monospace only for the real connection string; messages use the UI font.
    ...(status === 'finished' && { fontFamily: theme.editorFontFamily }),
    fontWeight: 500,
    fontSize: variables.fontSize.sm,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
}));

export const ConnectionBoxContentStyled = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  width: '100%',
  minWidth: 0,
  overflow: 'hidden'
}));

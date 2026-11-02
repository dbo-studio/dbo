import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const DiffTableStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  overflow: 'hidden'
}));

export const DiffTableHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
  backgroundColor: theme.palette.action.hover
}));

export const DiffOpStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'muted'
})<{ muted: boolean }>(({ theme, muted }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1),
  padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
  borderTop: `1px solid ${theme.palette.divider}`,
  opacity: muted ? 0.5 : 1
}));

export const DiffRowStyled = styled('div', {
  shouldForwardProp: (prop) => prop !== 'sign'
})<{ sign: '+' | '~' | '−' }>(({ theme, sign }) => ({
  fontFamily: 'var(--editor-font, monospace)',
  fontSize: variables.fontSize.sm,
  wordBreak: 'break-word',
  color:
    sign === '+' ? theme.palette.success.main : sign === '−' ? theme.palette.error.main : theme.palette.warning.main
}));

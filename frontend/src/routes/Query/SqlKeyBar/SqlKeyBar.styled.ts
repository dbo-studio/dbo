import { variables } from '@/core/theme/variables';
import { Box, ButtonBase, styled } from '@mui/material';

export const SqlKeyBarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: theme.spacing(0.75, 1),
  overflowX: 'auto',
  flexShrink: 0,
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.subdued
}));

export const SqlKeyStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'keyword'
})<{ keyword?: boolean }>(({ theme, keyword }) => ({
  minWidth: 34,
  height: 34,
  padding: theme.spacing(0, keyword ? 1.25 : 0.75),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.text,
  fontFamily: 'var(--editor-font, monospace)',
  fontSize: keyword ? 11 : 15,
  fontWeight: keyword ? 600 : 400,
  letterSpacing: keyword ? '0.04em' : undefined,
  flexShrink: 0,
  '&:active': {
    backgroundColor: theme.palette.action.selected
  }
}));

export const SqlKeyDividerStyled = styled(Box)(({ theme }) => ({
  width: 1,
  height: 18,
  flexShrink: 0,
  backgroundColor: theme.palette.divider
}));

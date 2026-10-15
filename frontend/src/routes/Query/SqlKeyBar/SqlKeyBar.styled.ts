import { ButtonBase, Box, styled } from '@mui/material';

export const SqlKeyBarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.5, 1),
  overflowX: 'auto',
  flexShrink: 0,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper
}));

export const SqlKeyStyled = styled(ButtonBase)(({ theme }) => ({
  minWidth: 44,
  minHeight: 36,
  padding: theme.spacing(0, 1.25),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 5,
  fontFamily: 'var(--editor-font, monospace)',
  fontSize: 13,
  color: theme.palette.text.primary,
  flexShrink: 0,
  '&:active': {
    backgroundColor: theme.palette.action.selected
  }
}));

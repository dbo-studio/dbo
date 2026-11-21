import { variables } from '@/core/theme/variables';
import { alpha, Box, styled } from '@mui/material';

export const PreviewCardStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.small,
  overflow: 'hidden',
  marginBottom: theme.spacing(2),
  background: theme.palette.background.subdued
}));

export const PreviewChromeStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.default
}));

export const PreviewEditorStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  fontSize: variables.fontSize.md,
  lineHeight: 1.5,
  background: alpha(theme.palette.background.default, 0.6)
}));
import { variables } from '@/core/theme/variables';
import { Box, styled, Typography } from '@mui/material';

// Same look as the app's other dropdowns: flat, bordered, default background.
export const ContextPickerStyled = styled(Box)(({ theme }) => ({
  width: 240,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  boxShadow: 'none',
  overflow: 'hidden'
}));

export const ContextPickerListStyled = styled(Box)(({ theme }) => ({
  maxHeight: 200,
  overflowY: 'auto',
  padding: theme.spacing(0.5)
}));

export const ContextPickerGroupStyled = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(0.5, 0.75, 0.25),
  fontSize: variables.fontSize.xxs,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: theme.palette.text.secondary
}));

export const ContextPickerItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active: boolean }>(({ theme, active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  height: 24,
  padding: theme.spacing(0, 0.75),
  borderRadius: variables.radius.small,
  cursor: 'pointer',
  backgroundColor: active ? theme.palette.action.hover : 'transparent'
}));

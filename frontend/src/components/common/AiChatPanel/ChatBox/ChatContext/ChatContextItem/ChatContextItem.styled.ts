import { variables } from '@/core/theme/variables';
import { Box, ButtonBase, styled } from '@mui/material';

// Fixed size and structure: the chip never changes shape on hover, so the row does not jump.
export const ChatContextItemStyled = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  gap: theme.spacing(0.5),
  height: 22,
  maxWidth: 180,
  padding: theme.spacing(0, 0.25, 0, 0.75),
  borderRadius: variables.radius.medium,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default
}));

export const ChatContextItemRemoveStyled = styled(ButtonBase)(({ theme }) => ({
  width: 16,
  height: 16,
  flexShrink: 0,
  borderRadius: '50%',
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary
  },
  '&.Mui-focusVisible': {
    outline: `2px solid ${theme.palette.primary.main}`
  }
}));

import { variables } from '@/core/theme/variables';
import { Box, ButtonBase, styled } from '@mui/material';

// Each run of items between separators is one bordered card, like the cards used across the phone shell.
export const ActionSheetGroupStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden',
  '& + &': {
    marginTop: theme.spacing(1)
  }
}));

export const ActionSheetItemStyled = styled(ButtonBase)(({ theme }) => ({
  width: '100%',
  minHeight: 52,
  justifyContent: 'flex-start',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0, 2),
  color: theme.palette.text.text,
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none'
  },
  '&:active': {
    backgroundColor: theme.palette.action.hover
  },
  '&.destructive': {
    color: theme.palette.error.main
  },
  '&.Mui-disabled': {
    opacity: 0.5
  }
}));

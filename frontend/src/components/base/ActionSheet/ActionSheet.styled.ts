import { ButtonBase, styled } from '@mui/material';

export const ActionSheetItemStyled = styled(ButtonBase)(({ theme }) => ({
  width: '100%',
  minHeight: 48,
  justifyContent: 'flex-start',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0, 0.5),
  color: theme.palette.text.primary,
  '&.destructive': {
    color: theme.palette.error.main
  },
  '&.Mui-disabled': {
    opacity: 0.5
  }
}));

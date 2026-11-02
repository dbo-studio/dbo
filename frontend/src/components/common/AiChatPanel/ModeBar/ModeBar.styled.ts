import { Button, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const ModeButtonStyled = styled(Button)(({ theme }) => ({
  minWidth: 0,
  height: 24,
  flexShrink: 0,
  padding: theme.spacing(0, 0.75),
  textTransform: 'none',
  fontWeight: 500,
  fontSize: variables.fontSize.sm,
  color: theme.palette.text.secondary,
  gap: theme.spacing(0.25),
  '& .MuiButton-startIcon, & .MuiButton-endIcon': { margin: 0 }
}));

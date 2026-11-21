import { Stack, styled, Typography } from '@mui/material';

export const FieldRootStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(2)
}));

export const FieldLabelStyled = styled(Typography)({
  width: 96,
  flexShrink: 0
});

import { Stack, styled } from '@mui/material';

/** Sits just above the composer, where the eye already is. Without a composer it is centered instead. */
export const EmptyLayoutStyled = styled(Stack, {
  shouldForwardProp: (prop) => prop !== '$centered'
})<{ $centered?: boolean }>(({ theme, $centered }) => ({
  flex: 1,
  padding: theme.spacing(3, 1),
  alignItems: 'center',
  justifyContent: $centered ? 'center' : 'flex-end',
  minHeight: 200,
  gap: theme.spacing(2.5)
}));

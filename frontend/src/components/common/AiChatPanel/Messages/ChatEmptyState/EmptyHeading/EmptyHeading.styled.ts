import { Stack, Typography, styled } from '@mui/material';

export const EmptyHeadingStyled = styled(Stack)(({ theme }) => ({
  alignItems: 'center',
  textAlign: 'center',
  gap: theme.spacing(1)
}));

export const EmptySubtitleStyled = styled(Typography)({
  maxWidth: 280,
  lineHeight: 1.5
});

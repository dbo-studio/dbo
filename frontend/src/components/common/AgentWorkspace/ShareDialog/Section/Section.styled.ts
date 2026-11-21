import { Stack, styled, Typography } from '@mui/material';

export const SectionRootStyled = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1)
}));

export const SectionTitleStyled = styled(Typography)({
  fontWeight: 600
});

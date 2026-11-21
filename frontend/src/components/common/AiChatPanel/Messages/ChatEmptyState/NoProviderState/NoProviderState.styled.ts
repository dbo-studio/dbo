import { variables } from '@/core/theme/variables';
import { Box, Stack, Typography, alpha, styled } from '@mui/material';
import type { Theme } from '@mui/material/styles';

const accentWash = (theme: Theme): string => alpha(theme.palette.primary.main, 0.12);

export const NoProviderColumnStyled = styled(Stack)(({ theme }) => ({
  width: '100%',
  maxWidth: 320,
  gap: theme.spacing(2.5)
}));

export const NoProviderIntroStyled = styled(Stack)(({ theme }) => ({
  alignItems: 'flex-start',
  gap: theme.spacing(1)
}));

export const SetupIconStyled = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  display: 'grid',
  placeItems: 'center',
  borderRadius: variables.radius.large,
  color: theme.palette.primary.main,
  backgroundColor: accentWash(theme)
}));

export const ProviderGridStyled = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: theme.spacing(0.75)
}));

export const ProviderTileStyled = styled(Stack)(({ theme }) => ({
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1.25),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.paper
}));

export const NoProviderTitleStyled = styled(Typography)({
  fontWeight: 600
});

export const BenefitListStyled = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(0.75)
}));

export const BenefitRowStyled = styled(Stack)(({ theme }) => ({
  alignItems: 'center',
  gap: theme.spacing(1)
}));

export const BenefitMarkStyled = styled(Box)(({ theme }) => ({
  width: 16,
  height: 16,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  color: theme.palette.primary.main,
  backgroundColor: accentWash(theme)
}));

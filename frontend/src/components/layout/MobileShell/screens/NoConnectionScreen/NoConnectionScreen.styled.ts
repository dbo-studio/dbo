import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const NoConnectionScreenStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  backgroundColor: theme.palette.background.subdued
}));

export const NoConnectionHeroStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(5, 3, 3)
}));

export const NoConnectionLogoStyled = styled('img')({
  width: 64,
  height: 64,
  marginBottom: 8
});

export const NoConnectionTitleStyled = styled('h2')(({ theme }) => ({
  margin: 0,
  fontSize: variables.fontSize.xxl,
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.text.title
}));

export const NoConnectionTextStyled = styled('p')(({ theme }) => ({
  margin: 0,
  maxWidth: 300,
  fontSize: variables.fontSize.md,
  lineHeight: 1.5,
  color: theme.palette.text.subdued
}));

// Same small uppercase label as the desktop sidebar section headers.
export const NoConnectionSectionLabelStyled = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2, 0.75),
  fontSize: variables.fontSize.xs,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: theme.palette.text.subdued
}));

export const NoConnectionListStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const NoConnectionEnginesStyled = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(1),
  width: '100%',
  maxWidth: 320,
  margin: theme.spacing(2, 0)
}));

export const NoConnectionEngineStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: theme.spacing(1.25, 0.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 5,
  backgroundColor: theme.palette.background.default,
  fontSize: variables.fontSize.xs,
  color: theme.palette.text.text
}));

// Engine logos are drawn for light backgrounds; keep the same light chip as the desktop connection picker.
export const NoConnectionEngineLogoStyled = styled(Box)(({ theme }) => ({
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: variables.radius.small,
  backgroundColor: theme.palette.grey[200]
}));

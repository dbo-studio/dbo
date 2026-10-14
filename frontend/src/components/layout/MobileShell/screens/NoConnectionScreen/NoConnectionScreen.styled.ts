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
  fontSize: 18,
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.text.title
}));

export const NoConnectionTextStyled = styled('p')(({ theme }) => ({
  margin: 0,
  maxWidth: 300,
  fontSize: 13,
  lineHeight: 1.5,
  color: theme.palette.text.subdued
}));

// Same small uppercase label as the desktop sidebar section headers.
export const NoConnectionSectionLabelStyled = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2, 0.75),
  fontSize: 11,
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
  fontSize: 11,
  color: theme.palette.text.text
}));

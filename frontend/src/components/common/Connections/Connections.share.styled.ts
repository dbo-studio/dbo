import { Box, styled, Typography } from '@mui/material';

export const ConnectionGroupHeadingStyled = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1, 1, 0.5),
  color: theme.palette.text.text,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  flexShrink: 0
}));

export const ShareMemberListStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2)
}));

export const ShareMemberRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1)
}));

export const ShareFormStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  marginTop: theme.spacing(2)
})) as typeof Box;

export const ShareFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2)
}));

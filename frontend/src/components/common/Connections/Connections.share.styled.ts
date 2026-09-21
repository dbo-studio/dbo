import { Box, styled } from '@mui/material';

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

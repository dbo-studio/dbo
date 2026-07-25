import { Box, styled } from '@mui/material';

export const AboutPanelLogoStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  textAlign: 'center'
}));

export const AboutPanelVersionStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  textAlign: 'center'
}));

export const AboutPanelLinksStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'column'
}));

export const AboutPanelLinkRowStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center'
}));

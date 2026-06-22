import { Box, styled } from '@mui/material';

export const AiPanelFormStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

export const AiPanelFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing(2),
  justifyContent: 'space-between'
}));

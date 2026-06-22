import { Box, styled } from '@mui/material';

export const AiChatPanelContainerStyled = styled(Box)(() => ({
  height: '100%',
  minHeight: 0,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column'
}));

export const HeaderContainerStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(1)
}));

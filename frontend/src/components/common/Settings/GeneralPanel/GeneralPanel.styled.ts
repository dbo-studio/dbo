import { Box, styled } from '@mui/material';

export const GeneralPanelSettingRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginBottom: theme.spacing(1),
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between'
}));

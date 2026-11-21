import { Box, styled } from '@mui/material';

export const SettingGroupStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  marginBottom: theme.spacing(1.5)
}));
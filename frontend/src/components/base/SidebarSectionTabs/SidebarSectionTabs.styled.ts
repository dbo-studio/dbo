import { Box, styled } from '@mui/material';

export const SidebarTabPanelStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(1),
  background: theme.palette.background.default,
  overflow: 'hidden'
}));

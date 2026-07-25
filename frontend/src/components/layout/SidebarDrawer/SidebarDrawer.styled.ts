import { Drawer, styled } from '@mui/material';

export const SidebarDrawerStyled = styled(Drawer)(({ theme }) => ({
  zIndex: theme.zIndex.drawer,
  '& .MuiDrawer-paper': {
    width: 'min(500px, 90vw)',
    maxWidth: '100%',
    height: '100%',
    overflow: 'hidden'
  }
}));

import { Box, styled } from '@mui/material';

export const TreeViewContainerStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: 'transparent',
  userSelect: 'none'
});

export const TreeViewContentStyled = styled(Box)(({ theme }) => ({
  overflow: 'auto',
  flex: 1,
  minHeight: 0,
  padding: '4px 0',
  marginTop: theme.spacing(1),
}));

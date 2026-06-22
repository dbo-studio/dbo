import { Box, styled } from '@mui/material';

export const ObjectFormStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100%',
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const ObjectFormLoadingStyled = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
  minHeight: 200
}));

export const ObjectFormContentStyled = styled(Box)(() => ({
  overflow: 'hidden',
  flexDirection: 'column',
  display: 'flex',
  width: '100%'
}));

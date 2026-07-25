import { Box, styled } from '@mui/material';

export const DataContentStyled = styled(Box)(() => ({
  position: 'relative',
  overflow: 'hidden',
  flex: 1,
  display: 'flex',
  flexDirection: 'row'
}));

export const DataLoadingStyled = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%'
}));

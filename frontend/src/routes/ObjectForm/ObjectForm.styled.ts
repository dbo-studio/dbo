import { Box, styled } from '@mui/material';

export const ObjectFormStyled = styled(Box)(() => ({
  display: 'flex',
  height: '100%'
}));

export const ObjectFormLoadingStyled = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
  minHeight: 200
}));

export const ObjectFormContentStyled = styled(Box)(() => ({
  // The status bar draws its own top border; drop the one on the element right above it.
  '& > :nth-last-child(2)': { borderBottom: 'none' },
  overflow: 'hidden',
  flexDirection: 'column',
  display: 'flex',
  width: '100%'
}));

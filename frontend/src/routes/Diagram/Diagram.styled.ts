import { Box, styled } from '@mui/material';

export const DiagramPanelStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0
});

export const DiagramCanvasStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  position: 'relative'
});

export const DiagramLoadingStyled = styled(Box)({
  display: 'flex',
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center'
});

import { Box, styled } from '@mui/material';

type ResizableYBoxStyledProps = {
  boxHeight: number;
};

export const ResizableYBoxStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'boxHeight'
})<ResizableYBoxStyledProps>(({ boxHeight }) => ({
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  height: boxHeight,
  minHeight: 0,
  width: '100%'
}));

import { Box, styled } from '@mui/material';

type ResizableYBoxStyledProps = {
  boxHeight: number;
};

export const ResizableYBoxStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'boxHeight'
})<ResizableYBoxStyledProps>(({ boxHeight }) => ({
  display: 'flex',
  position: 'relative',
  overflow: 'hidden',
  height: boxHeight
}));

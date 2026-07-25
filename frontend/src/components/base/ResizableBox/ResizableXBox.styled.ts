import { Box, styled } from '@mui/material';

type ResizableXBoxStyledProps = {
  boxWidth: number;
};

export const ResizableXBoxStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'boxWidth'
})<ResizableXBoxStyledProps>(({ boxWidth }) => ({
  position: 'relative',
  overflow: 'hidden',
  width: boxWidth
}));

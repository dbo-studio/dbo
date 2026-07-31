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
  maxHeight: '100%',
  minHeight: 0,
  flexShrink: 1,
  width: '100%',
  '& > *:last-child': {
    flex: 1,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden'
  }
}));

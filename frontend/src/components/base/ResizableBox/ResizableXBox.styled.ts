import { Box, styled } from '@mui/material';

type ResizableXBoxStyledProps = {
  boxWidth: number | string;
  /** Animates width changes that are not a drag, such as expanding the panel. */
  animate?: boolean;
};

export const ResizableXBoxStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'boxWidth' && prop !== 'animate'
})<ResizableXBoxStyledProps>(({ boxWidth, animate }) => ({
  position: 'relative',
  overflow: 'hidden',
  width: boxWidth,
  // Dragging follows the pointer; any other width change (expanding the panel) eases.
  transition: animate ? 'width 220ms ease' : 'none'
}));

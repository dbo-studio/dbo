import { variables } from '@/core/theme/variables.ts';
import { Box, styled } from '@mui/material';

export const ResizableModalWrapperStyled = styled(Box)(({ theme }) => ({
  overflow: 'hidden',
  minHeight: '400px',
  minWidth: '400px',
  borderRadius: variables.radius.medium,
  background: theme.palette.background.default,
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  ':focus-visible': {
    outline: 'unset'
  }
})) as typeof Box;

export const ResizeHandle = styled('div')({
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: '20px',
  height: '20px',
  cursor: 'nwse-resize',
  '&:after': {
    content: '""',
    position: 'absolute',
    right: '3px',
    bottom: '3px',
    width: '0',
    height: '0',
    borderStyle: 'solid',
    borderWidth: '0 0 12px 12px',
    borderColor: 'transparent transparent #666 transparent'
  }
});

import { Box } from '@mui/material';

import { styled } from '@mui/material';

export const TreeViewContainerStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: 'transparent',
  userSelect: 'none'
});

export const TreeViewContentStyled = styled(Box)({
  overflow: 'auto',
  flex: 1,
  padding: '4px 0',
  '&::-webkit-scrollbar': {
    width: '10px'
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(100, 100, 100, 0.4)',
    borderRadius: '3px',
    '&:hover': {
      backgroundColor: 'rgba(100, 100, 100, 0.7)'
    }
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent'
  }
});

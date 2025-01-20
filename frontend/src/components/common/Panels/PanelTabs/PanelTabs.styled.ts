import { Box, styled } from '@mui/material';

export const PanelTabsStyled = styled(Box)(() => ({
  display: 'flex',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none'
  }
})) as typeof Box;

import { Box, styled } from '@mui/material';

export const PanelItemStyled = styled(Box)(({ theme }) => ({
  overflow: 'hidden',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderTop: `1px solid ${theme.palette.divider}`
}));

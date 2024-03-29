import { Box, styled } from '@mui/material';

export const ColumnsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flex: 1,
  overflow: 'auto',
  borderTop: `1px solid ${theme.palette.divider}`
}));

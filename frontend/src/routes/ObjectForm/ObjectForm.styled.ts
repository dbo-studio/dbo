import { Box, styled } from '@mui/material';

export const ObjectFormStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100%',
  borderTop: `1px solid ${theme.palette.divider}`
}));

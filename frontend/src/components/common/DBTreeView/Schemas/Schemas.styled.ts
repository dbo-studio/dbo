import { Box, styled } from '@mui/material';

export const SchemasStyled = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  left: 0,
  bottom: 0,
  padding: `0 ${theme.spacing(2)}`,
  background: theme.palette.background.paper,
  margin: '1px'
}));

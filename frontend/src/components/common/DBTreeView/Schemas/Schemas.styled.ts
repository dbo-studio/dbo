import { Box, styled } from '@mui/material';

export const SchemasStyled = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  left: 0,
  bottom: 0,
  background: theme.palette.background.default,
  margin: theme.spacing(2)
}));

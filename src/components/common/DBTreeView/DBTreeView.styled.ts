import { Box, styled } from '@mui/material';

export const SchemaStyled = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  left: 0,
  bottom: 0,
  padding: theme.spacing(2),
  background: theme.palette.background.default
}));
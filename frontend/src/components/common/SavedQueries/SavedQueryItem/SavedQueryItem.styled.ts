import { Box, styled } from '@mui/material';

export const SavedQueryItemStyled = styled(Box)(({ theme }) => ({
  padding: `${theme.spacing(1)} ${theme.spacing(1)}`,
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}));

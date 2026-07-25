import { Box, styled, Typography } from '@mui/material';

export const HeaderColumnContentStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  justifyContent: 'space-between'
}));

export const HeaderColumnTypeStyled = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  color: theme.palette.text.placeholder
}));

import { Box, styled, Typography } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const HeaderColumnContentStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  justifyContent: 'space-between'
}));

export const HeaderColumnTypeStyled = styled(Typography)(({ theme }) => ({
  fontSize: variables.fontSize.xxs,
  color: theme.palette.text.placeholder
}));

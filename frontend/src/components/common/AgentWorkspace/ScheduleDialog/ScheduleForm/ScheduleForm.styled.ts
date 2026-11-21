import { Box, Stack, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const ScheduleFormBodyStyled = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1.5),
  width: 600,
  maxWidth: '100%'
}));

export const ScheduleNewStyled = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.small,
  padding: theme.spacing(1)
}));

export const ScheduleWeekdayStyled = styled(Box)({
  width: 150
});

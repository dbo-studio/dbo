import { Box, Stack, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const ScheduleRowRootStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.small,
  padding: theme.spacing(1)
}));

export const ScheduleRowHeadStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5)
}));

export const ScheduleRowActionsStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5)
}));
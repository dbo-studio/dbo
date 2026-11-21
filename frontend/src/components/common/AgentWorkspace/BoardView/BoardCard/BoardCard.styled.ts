import { Box, Stack, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const BoardCardRootStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'editing' && prop !== 'wide'
})<{ editing: boolean; wide: boolean }>(({ theme, editing, wide }) => ({
  gridColumn: wide ? 'span 2' : 'span 1',
  border: `1px solid ${editing ? theme.palette.primary.main : theme.palette.divider}`,
  borderStyle: editing ? 'dashed' : 'solid',
  borderRadius: variables.radius.small,
  padding: theme.spacing(1),
  minWidth: 0,
  backgroundColor: theme.palette.background.paper
}));

export const BoardCardHeadStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  marginBottom: theme.spacing(0.5)
}));

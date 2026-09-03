import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const DiagramSourceRootStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.paper
}));

export const DiagramSourceHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
  padding: theme.spacing(0.5, 0.5, 0.5, 1),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const DiagramSourceBodyStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  '& pre': {
    whiteSpace: 'pre !important'
  },
  '& .shiki': {
    background: 'transparent !important'
  }
});

export const DiagramSourceLoadingStyled = styled(Box)({
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 120
});

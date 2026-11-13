import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const SnippetChipsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  margin: theme.spacing(1, 0)
}));

export const SnippetCardStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(1),
  overflow: 'hidden',
  '& .snippet-actions': { opacity: 0.4, transition: 'opacity 120ms' },
  '&:hover .snippet-actions, &:focus-within .snippet-actions': { opacity: 1 },
  '& pre': { margin: 0, whiteSpace: 'pre !important', overflowX: 'auto', padding: theme.spacing(1) },
  '& .shiki': { background: 'transparent !important' }
}));

export const SnippetHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  padding: theme.spacing(0.25, 0.5, 0.25, 1),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

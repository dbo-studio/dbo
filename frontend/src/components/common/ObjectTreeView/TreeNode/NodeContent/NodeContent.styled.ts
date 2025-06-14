import { variables } from '@/core/theme/variables';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

export const NodeLabel = styled(Box, {
  shouldForwardProp: (prop: string): boolean => prop !== 'isFocused'
})<{ isFocused?: boolean }>(({ theme, isFocused }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.2, 0.4),
  cursor: 'pointer',
  borderRadius: variables.radius.small,
  width: '100%',
  overflow: 'hidden',
  border: '1px solid transparent',
  height: '22px',
  transition: 'background-color 0.1s ease',
  position: 'relative',
  zIndex: 1,
  gap: theme.spacing(0.5),
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  },
  ...(isFocused && {
    backgroundColor: theme.palette.action.hover
  })
}));

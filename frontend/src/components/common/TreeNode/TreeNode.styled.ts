import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { variables } from '@/core/theme/variables.ts';
import Typography from '@mui/material/Typography';

export const TreeNodeContainer = styled(Box)({
  flexDirection: 'column',
  display: 'flex',
  flexWrap: 'nowrap',
  overflowX: 'auto',
  alignItems: 'flex-start',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  minWidth: 0,
  maxWidth: '100%',
  '&::-webkit-scrollbar': {
    height: '8px'
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#888',
    borderRadius: '4px'
  }
});

export const NodeLabel = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isFocused'
})<{ isFocused?: boolean }>(({ theme, isFocused }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.4),
  cursor: 'pointer',
  borderRadius: variables.radius.medium,
  color: theme.palette.text.text,
  width: '100%',
  overflow: 'hidden',
  border: '1px solid transparent',
  // '&:hover': {
  //   backgroundColor: theme.palette.background.primary
  // },
  ...(isFocused && {
    backgroundColor: theme.palette.background.primary,
    border: `1px solid ${theme.palette.divider}`
  }),
  '&:focus-visible': {
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.primary
  }
}));

export const NodeName = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isLeaf'
})<{ isLeaf: boolean }>(({ theme, isLeaf }) => ({
  paddingLeft: isLeaf ? theme.spacing(2) : 0
}));

export const NodeType = styled(Typography)(({ theme }) => ({
  fontSize: '0.9em',
  marginLeft: theme.spacing(0.5),
  color: theme.palette.text.secondary
}));

export const ChildrenContainer = styled(Box)({
  paddingLeft: '20px',
  width: '100%'
});

export const LoadingIndicator = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  display: 'flex',
  alignItems: 'center'
}));

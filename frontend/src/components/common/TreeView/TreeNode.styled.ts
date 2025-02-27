import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { variables } from '@/core/theme/variables.ts';
import Typography from '@mui/material/Typography';

export const TreeNodeContainer = styled(Box)({});

export const NodeLabel = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isFocused'
})<{ isFocused?: boolean }>(({ theme, isFocused }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.4),
  cursor: 'pointer',
  borderRadius: variables.radius.medium,
  '&:hover': {
    backgroundColor: theme.palette.background.primary
  },
  ...(isFocused && {
    backgroundColor: theme.palette.background.primary,
    outline: `1px solid ${theme.palette.divider}`
  })
}));

export const NodeName = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isLeaf'
})<{ isLeaf: boolean }>(({ theme, isLeaf }) => ({
  paddingLeft: isLeaf ? theme.spacing(2) : 0
}));

export const NodeType = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.text,
  fontSize: '0.9em',
  marginLeft: theme.spacing(0.5)
}));

export const ChildrenContainer = styled(Box)({
  paddingLeft: '20px'
});

export const LoadingIndicator = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  display: 'flex',
  alignItems: 'center'
}));

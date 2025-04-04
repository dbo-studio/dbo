import { variables } from '@/core/theme/variables';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

export const NodeLabel = styled(Box, {
  shouldForwardProp: (prop: string): boolean => prop !== 'isFocused'
})<{ isFocused?: boolean }>(({ theme, isFocused }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.2, 0.4),
  cursor: 'pointer',
  borderRadius: variables.radius.small,
  color: theme.palette.text.text,
  width: '100%',
  overflow: 'hidden',
  border: '1px solid transparent',
  height: '22px',
  transition: 'background-color 0.1s ease',
  position: 'relative',
  zIndex: 1,
  '&:hover': {
    backgroundColor: theme.palette.action.selected
  },
  ...(isFocused && {
    backgroundColor: theme.palette.action.selected,
    border: '1px solid transparent'
  }),
  '&:focus-visible': {
    outline: 'none',
    border: '1px solid transparent',
    backgroundColor: theme.palette.action.selected
  }
}));

export const NodeName = styled(Typography, {
  shouldForwardProp: (prop: string): boolean => prop !== 'isLeaf'
})<{ isLeaf: boolean }>(({ theme, isLeaf }) => ({
  paddingLeft: isLeaf ? theme.spacing(1.5) : theme.spacing(0.25),
  fontSize: '13px',
  lineHeight: '20px',
  fontWeight: 400,
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}));

export const NodeType = styled(Typography)(({ theme }) => ({
  fontSize: '0.85em',
  marginLeft: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  opacity: 0.7
}));

export const LoadingIndicator = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  display: 'flex',
  alignItems: 'center'
}));

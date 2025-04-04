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
    backgroundColor: theme.palette.action.hover,
    '& p': {
      fontWeight: 500
    }
  })
}));

export const NodeName = styled(Typography, {
  shouldForwardProp: (prop: string): boolean => prop !== 'isLeaf'
})<{ isLeaf: boolean }>(({ theme }) => ({
  fontSize: '13px',
  lineHeight: '20px',
  fontWeight: 400,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: theme.palette.text.text,
  marginLeft: theme.spacing(0.5)
}));

export const LoadingIndicator = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  display: 'flex',
  alignItems: 'center'
}));

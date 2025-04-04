import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

export const TreeNodeContainer = styled(Box)({
  flexDirection: 'column',
  display: 'flex',
  flexWrap: 'nowrap',
  alignItems: 'flex-start',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  minWidth: 0,
  maxWidth: '100%',
  position: 'relative'
});

export const NodeLabel = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'isFocused'
})<{ isFocused?: boolean }>(({ theme, isFocused }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.4),
  cursor: 'pointer',
  borderRadius: 0,
  color: theme.palette.text.primary,
  width: '100%',
  overflow: 'hidden',
  border: '1px solid transparent',
  height: '22px',
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  },
  ...(isFocused && {
    backgroundColor: theme.palette.action.selected
  })
}));

export const NodeName = styled(Typography, {
  shouldForwardProp: (prop): boolean => prop !== 'isLeaf'
})<{ isLeaf: boolean }>(({ theme, isLeaf }) => ({
  paddingLeft: isLeaf ? theme.spacing(2) : 0,
  fontSize: '13px',
  lineHeight: '20px',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}));

export const NodeType = styled(Typography)(({ theme }) => ({
  fontSize: '0.85em',
  marginLeft: theme.spacing(0.5),
  color: theme.palette.text.secondary
}));

export const ChildrenContainer = styled(Box)({
  paddingLeft: '20px',
  width: '100%',
  position: 'relative'
});

export const LoadingIndicator = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  display: 'flex',
  alignItems: 'center'
}));

export const ToggleContainerStyled = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'hasChildren'
})<{ hasChildren: boolean }>(({ hasChildren }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '20px',
  height: '20px',
  visibility: hasChildren ? 'visible' : 'hidden',
  cursor: hasChildren ? 'pointer' : 'default'
}));

export const HoverableTreeNodeContainerStyled = styled(TreeNodeContainer)({
  position: 'relative',
  width: '100%'
});

import { variables } from '@/core/theme/variables';
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
  shouldForwardProp: (prop): boolean => prop !== 'isFocused' && prop !== 'level'
})<{ isFocused?: boolean; level: number }>(({ theme, isFocused, level }) => ({
  padding: theme.spacing(0.4),
  paddingLeft: `${level * 20}px`,
  display: 'flex',
  alignItems: 'center',
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
      fontWeight: 500,
      color: theme.palette.text.primary
    }
  })
}));

export const NodeContent = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  height: '100%',
  flex: 1
});

export const NodeName = styled(Typography, {
  shouldForwardProp: (prop): boolean => prop !== 'isLeaf'
})<{ isLeaf: boolean }>(({ theme }) => ({
  fontSize: '13px',
  lineHeight: '20px',
  fontWeight: 400,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: theme.palette.text.text,
  marginLeft: theme.spacing(0.5)
}));

export const NodeType = styled(Typography)(({ theme }) => ({
  fontSize: '0.85em',
  marginLeft: theme.spacing(0.5),
  color: theme.palette.text.secondary
}));

export const ChildrenContainer = styled(Box)({
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

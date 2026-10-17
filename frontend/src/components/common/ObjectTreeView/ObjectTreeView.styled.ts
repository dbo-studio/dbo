import { variables } from '@/core/theme/variables';
import { alpha, Box, keyframes, styled, Typography } from '@mui/material';

export const TREE_ROW_HEIGHT = 22;
const TREE_INDENT = 16;

const reveal = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
`;

const shimmer = keyframes`
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
`;

export const TreeViewContainerStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: 'transparent',
  userSelect: 'none'
});

export const TreeViewContentStyled = styled(Box)(({ theme }) => ({
  overflow: 'auto',
  flex: 1,
  minHeight: 0,
  padding: '4px 0',
  marginTop: theme.spacing(1),
  '&:focus-visible': { outline: 'none' }
}));

export const TreeSearchStatusStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.5, 1, 0),
  color: theme.palette.text.subdued,
  fontSize: variables.fontSize.xs
}));

export const TreeEmptyStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  color: theme.palette.text.subdued,
  fontSize: variables.fontSize.md
}));

/** Fixed chevron column: leaves keep it empty so icons and names line up with sibling folders. */
export const NodeToggleSlot = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'expanded'
})<{ expanded?: boolean }>(({ expanded }) => ({
  width: 16,
  height: 16,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& svg': {
    transform: expanded ? 'rotate(90deg)' : 'none',
    transition: `transform ${variables.motion.base} ${variables.motion.easing}`
  }
}));

type NodeLabelProps = { isFocused?: boolean; isSelected?: boolean; level: number; reveal?: boolean };

export const NodeLabel = styled(Box, {
  shouldForwardProp: (prop): boolean => !['isFocused', 'isSelected', 'level', 'reveal'].includes(String(prop))
})<NodeLabelProps>(({ theme, isFocused, isSelected, level, reveal: shouldReveal }) => ({
  padding: theme.spacing(0.4),
  paddingLeft: `${level * TREE_INDENT}px`,
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  borderRadius: variables.radius.small,
  width: '100%',
  overflow: 'hidden',
  border: '1px solid transparent',
  height: `${TREE_ROW_HEIGHT}px`,
  transition: `background-color ${variables.motion.fast} ${variables.motion.easing}`,
  position: 'relative',
  zIndex: 1,
  gap: theme.spacing(0.5),
  outline: 'none',
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  },
  ...(isFocused && {
    backgroundColor: theme.palette.action.hover,
    '& p': {
      fontWeight: 500,
      color: theme.palette.text.link
    }
  }),
  ...(isSelected && {
    backgroundColor: theme.palette.action.selected,
    '& p': {
      fontWeight: 500,
      color: theme.palette.text.link
    },
    '&:hover': {
      backgroundColor: theme.palette.action.selected
    }
  }),
  '&:focus-visible': {
    borderColor: theme.palette.primary.main
  },
  ...(shouldReveal && { animation: `${reveal} ${variables.motion.base} ${variables.motion.easing} both` }),
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    transition: 'none',
    '& svg': { transition: 'none' }
  }
}));

export const NodeRowContent = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  height: '100%',
  flex: 1,
  minWidth: 0
});

export const NodeMatch = styled('mark')(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.22),
  color: 'inherit',
  borderRadius: 2
}));

export const LoadingRowStyled = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'level'
})<{ level: number }>(({ theme, level }) => ({
  height: TREE_ROW_HEIGHT,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: `${level * TREE_INDENT + 24}px`,
  paddingRight: theme.spacing(2),
  '& span': {
    display: 'block',
    height: 8,
    width: '55%',
    borderRadius: variables.radius.small,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.action.hover} 25%, ${theme.palette.action.selected} 50%, ${theme.palette.action.hover} 75%)`,
    backgroundSize: '200% 100%',
    animation: `${shimmer} 1.4s linear infinite`
  },
  '@media (prefers-reduced-motion: reduce)': {
    '& span': { animation: 'none' }
  }
}));

export const NodeName = styled(Typography)(({ theme }) => ({
  fontSize: variables.fontSize.md,
  lineHeight: '20px',
  fontWeight: 400,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: theme.palette.text.text,
  marginLeft: theme.spacing(0.5)
}));

import { variables } from '@/core/theme/variables';
import { alpha, Box, keyframes, styled, Typography } from '@mui/material';

export const TREE_ROW_HEIGHT = 22;
export const TREE_INDENT = 16;
/** Generous per-character estimate so long names are never clipped. */
export const TREE_CHAR_WIDTH = 8;

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
  overflowX: 'auto',
  overflowY: 'auto',
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
})<NodeLabelProps>(({ theme, isSelected, level, reveal: shouldReveal }) => ({
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
  // Indent guides: one vertical line per ancestor level, centred under that level's chevron.
  ...(level > 0 && {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: level * TREE_INDENT,
      pointerEvents: 'none',
      backgroundImage: `linear-gradient(to right, ${theme.palette.divider} 1px, transparent 1px)`,
      backgroundSize: `${TREE_INDENT}px 100%`,
      backgroundPosition: `${TREE_INDENT / 2}px 0`,
      backgroundRepeat: 'repeat-x'
    }
  }),
  // Hover is a faint neutral wash; selected is a brand tint. Hover must never read stronger than selected.
  '&:hover': {
    backgroundColor: alpha(theme.palette.text.primary, 0.06)
  },
  // The clicked row stays tinted even when it opens no tab (expand-only nodes).
  '&[data-active]': {
    backgroundColor: alpha(theme.palette.text.primary, 0.1)
  },
  ...(isSelected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.16),
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.22)
    }
  }),
  // Keyboard focus only: an inset ring on the active row, never from a mouse click.
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

export const NodeRenameInput = styled('input')(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  height: 18,
  marginLeft: theme.spacing(0.5),
  padding: '0 4px',
  font: 'inherit',
  fontSize: variables.fontSize.md,
  color: theme.palette.text.text,
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: variables.radius.small,
  outline: 'none'
}));

export const PinnedSectionStyled = styled(Box)(({ theme }) => ({
  paddingBottom: theme.spacing(0.5),
  marginBottom: theme.spacing(0.5),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const PinnedTitleStyled = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  color: theme.palette.text.subdued,
  fontSize: variables.fontSize.xs,
  textTransform: 'uppercase'
}));

export const EmptyNoteStyled = styled(Typography)(({ theme }) => ({
  fontSize: variables.fontSize.xs,
  color: theme.palette.text.subdued,
  fontStyle: 'italic'
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

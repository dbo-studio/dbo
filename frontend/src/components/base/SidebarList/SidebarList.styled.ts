import { Box, styled } from '@mui/material';

/** Collapsible section header of a sidebar list (Boards, Backup): 28px, chevron, caption. */
export const SidebarSectionHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  height: 28,
  paddingLeft: theme.spacing(0.5),
  cursor: 'pointer',
  userSelect: 'none',
  color: theme.palette.text.subdued,
  '&:hover': { color: theme.palette.text.text }
}));

/** One row of a sidebar list: 28px, hover tint, selected = the same tint the tree uses. */
export const SidebarItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  height: 28,
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  userSelect: 'none',
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  '&:hover': { backgroundColor: selected ? theme.palette.action.selected : theme.palette.action.hover },
  '&:focus-visible': { outline: `1px solid ${theme.palette.primary.main}`, outlineOffset: -1 }
}));

export const SidebarListStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  flex: 1,
  minHeight: 0,
  overflow: 'auto'
}));

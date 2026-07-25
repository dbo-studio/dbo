import { Box, styled } from '@mui/material';

export const SidebarSectionTabsRootStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: 35,
  flexShrink: 0,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

type SidebarSectionTabStyledProps = {
  selected: boolean;
  isLast: boolean;
};

export const SidebarSectionTabStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected' && prop !== 'isLast'
})<SidebarSectionTabStyledProps>(({ theme, selected, isLast }) => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minWidth: 0,
  borderRadius: 0,
  border: 'none',
  borderRight: isLast ? 'none' : `1px solid ${theme.palette.divider}`,
  borderBottom: `2px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
  background: selected ? theme.palette.background.default : theme.palette.background.subdued,
  color: selected ? theme.palette.text.text : theme.palette.text.subdued,
  fontSize: theme.typography.caption.fontSize,
  fontWeight: selected ? theme.typography.fontWeightMedium : theme.typography.fontWeightRegular,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  padding: `0 ${theme.spacing(1)}`,
  cursor: 'pointer',
  userSelect: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&:hover': {
    color: theme.palette.text.text,
    background: selected ? theme.palette.background.default : theme.palette.action.hover
  },
  '&:focus-visible': {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: -1
  }
}));

export const SidebarTabPanelStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(1),
  background: theme.palette.background.default,
  overflow: 'hidden'
}));

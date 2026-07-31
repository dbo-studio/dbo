import { Box, styled } from '@mui/material';

export const ConnectionFormContainerStyled = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 'min(480px, calc(100vw - 64px))',
  overflow: 'hidden'
}));

export const ConnectionFormBodyStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: theme.spacing(0.5),
  display: 'flex',
  flexDirection: 'column'
}));

export const ConnectionFormFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing(2),
  justifyContent: 'space-between',
  flexShrink: 0
}));

export const ConnectionFormCheckboxRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1)
}));

export const ConnectionFormTabsRootStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: 34,
  flexShrink: 0,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

type ConnectionFormTabStyledProps = {
  selected: boolean;
  isLast: boolean;
};

export const ConnectionFormTabStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected' && prop !== 'isLast'
})<ConnectionFormTabStyledProps>(({ theme, selected, isLast }) => ({
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
  '&:hover': {
    color: theme.palette.text.text,
    background: selected ? theme.palette.background.default : theme.palette.action.hover
  },
  '&:focus-visible': {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: -1
  }
}));

export const SQLitePathRowStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  alignItems: 'center'
}));

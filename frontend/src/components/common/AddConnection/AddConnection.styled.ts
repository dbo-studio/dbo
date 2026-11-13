import { Box, styled } from '@mui/material';

export const ConnectionFormContainerStyled = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden'
})) as typeof Box;

export const ConnectionFormBodyStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: theme.spacing(0.5),
  display: 'flex',
  flexDirection: 'column'
}));

// Side-by-side fields share the row equally, like the full-width ones above and below them.
export const ConnectionFormRowStyled = styled(Box, { shouldForwardProp: (p) => p !== 'hostPort' })<{
  /** A wide first field with a narrow second one, e.g. host and port. */
  hostPort?: boolean;
}>(({ theme, hostPort }) => ({
  display: 'grid',
  gridTemplateColumns: hostPort ? 'minmax(0, 1fr) 120px' : 'repeat(2, minmax(0, 1fr))',
  columnGap: theme.spacing(2)
}));

export const ConnectionFormCheckboxRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
  // The checkbox's own padding would make this row taller than every field around it.
  '& .MuiCheckbox-root': { padding: theme.spacing(0.5) },
  // MUI pulls the label left by the default 9px padding; keep the icon flush with the field edge instead.
  '& .MuiFormControlLabel-root': { marginLeft: theme.spacing(-0.5) }
}));

export const ConnectionFormTabsRootStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: 34,
  flexShrink: 0,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

type ConnectionFormTabStyledProps = {
  selected: boolean;
};

export const ConnectionFormTabStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<ConnectionFormTabStyledProps>(({ theme, selected }) => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minWidth: 0,
  borderRadius: 0,
  border: 'none',
  borderBottom: `2px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
  background: 'transparent',
  color: selected ? theme.palette.text.link : theme.palette.text.subdued,
  fontSize: theme.typography.caption.fontSize,
  fontWeight: selected ? theme.typography.fontWeightMedium : theme.typography.fontWeightRegular,
  padding: `0 ${theme.spacing(1)}`,
  cursor: 'pointer',
  userSelect: 'none',
  '&:hover': {
    color: theme.palette.text.text
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

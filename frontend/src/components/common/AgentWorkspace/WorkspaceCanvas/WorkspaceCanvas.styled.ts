import { Box, styled } from '@mui/material';

export const WorkspaceCanvasStyled = styled(Box)(({ theme }) => ({
  // It fills the resizable frame around it, which sets the width, expanded or not.
  width: '100%',
  height: '100%',
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  borderLeft: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.down('md')]: {
    position: 'absolute',
    inset: 0,
    width: 'auto',
    backgroundColor: theme.palette.background.default
  }
}));

export const WorkspaceCanvasHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  paddingRight: theme.spacing(0.5),
  // The tabs draw the bottom line under themselves; the buttons beside them continue it.
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& > :first-of-type [role=tablist]': { borderBottom: 'none' }
}));

export const WorkspaceCanvasBodyStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto'
}));

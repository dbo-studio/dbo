import { Box, styled } from '@mui/material';

export const WorkspaceCanvasStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'fullScreen'
})<{ fullScreen: boolean }>(({ theme, fullScreen }) => ({
  width: fullScreen ? 'auto' : 520,
  flex: fullScreen ? 1 : 'none',
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
  gap: theme.spacing(1),
  padding: `${theme.spacing(0.5)} ${theme.spacing(1.5)}`,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const WorkspaceCanvasBodyStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing(1.5)
}));

export const WorkspaceCanvasEmptyStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4, 2),
  textAlign: 'center',
  color: theme.palette.text.secondary
}));

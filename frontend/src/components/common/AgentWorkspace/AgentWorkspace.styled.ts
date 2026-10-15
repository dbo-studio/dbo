import { Box, styled } from '@mui/material';

export const AgentWorkspaceStyled = styled(Box)(({ theme }) => ({
  position: 'fixed',
  inset: 0,
  // Above the app and its drawers, below dialogs, menus and tooltips.
  zIndex: theme.zIndex.drawer + 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default
}));

export const WorkspaceBodyStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  display: 'flex'
}));

export const WorkspaceSessionsStyled = styled(Box)(({ theme }) => ({
  width: 260,
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  borderRight: `1px solid ${theme.palette.divider}`
}));

export const WorkspaceSessionsHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${theme.spacing(1)} ${theme.spacing(1.5)} 0`
}));

export const WorkspaceConversationStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  justifyContent: 'center',
  padding: `0 ${theme.spacing(2)}`
}));

export const WorkspaceThreadStyled = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 720,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: theme.spacing(2)
}));

export const WorkspaceComposerStyled = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  paddingTop: theme.spacing(1)
}));

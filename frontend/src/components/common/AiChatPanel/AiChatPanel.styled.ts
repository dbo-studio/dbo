import { Box, styled } from '@mui/material';

export const AiChatPanelContainerStyled = styled(Box)(() => ({
  height: '100%',
  minHeight: 0,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column'
}));

export const HeaderContainerStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
  [theme.breakpoints.down('sm')]: {
    paddingBlock: theme.spacing(0.5),
    paddingInline: theme.spacing(1.5)
  }
}));

export const ComposerContainerStyled = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  paddingTop: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
  // Phones: the sidebar that normally insets the composer is gone.
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1, 1.5)
  }
}));

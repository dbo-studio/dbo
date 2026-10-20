import { Box, styled, Typography } from '@mui/material';

export const DataValuePanelRootStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0
}));

export const DataValuePanelBodyStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}));

export const DataValuePanelFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
  flexShrink: 0
}));

export const DataValuePanelFooterActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1)
}));

export const DataValuePanelCaptionStyled = styled(Typography)(() => ({
  paddingLeft: 8,
  paddingRight: 8,
  paddingBottom: 4
}));

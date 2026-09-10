import { variables } from '@/core/theme/variables';
import { Box, styled, Typography } from '@mui/material';

export const DataValuePanelBodyStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}));

export const ImageDropzoneStyled = styled('div', {
  shouldForwardProp: (prop) => prop !== 'drag' && prop !== 'clickable'
})<{ drag?: boolean; clickable?: boolean }>(({ theme, drag, clickable }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  width: '100%',
  minHeight: 0,
  height: '100%',
  margin: 0,
  padding: theme.spacing(1.5),
  boxSizing: 'border-box',
  border: `1px dashed ${drag ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  background: drag ? theme.palette.action.hover : theme.palette.background.default,
  transition: 'border-color 0.15s ease, background 0.15s ease',
  cursor: clickable ? 'pointer' : 'default',
  overflow: 'hidden',
  ...(clickable && {
    '&:hover': {
      background: theme.palette.action.hover,
      borderColor: theme.palette.primary.main
    }
  })
}));

export const ImageDropzonePreviewStyled = styled('img')({
  maxWidth: '100%',
  maxHeight: '100%',
  width: 'auto',
  height: 'auto',
  objectFit: 'contain',
  display: 'block',
  pointerEvents: 'none'
});

export const ImageDropzoneHintStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(2),
  pointerEvents: 'none'
}));

export const VisuallyHiddenInputStyled = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1
});

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
  gap: theme.spacing(1),
  marginLeft: 'auto'
}));

export const DataValuePanelRootStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0
}));

export const DataValuePanelModeColumnStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0
}));

export const DataValuePanelImageColumnStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column'
}));

export const DataValuePanelGeometryColumnStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(1)
}));

export const DataValuePanelGeometryMapStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 160
}));

export const DataValuePanelHexPreviewStyled = styled(Box)(() => ({
  padding: 8,
  overflow: 'auto',
  flex: 1,
  fontFamily: 'monospace',
  fontSize: 12
}));

export const DataValuePanelCaptionStyled = styled(Typography)(() => ({
  paddingLeft: 8,
  paddingRight: 8,
  paddingBottom: 4
}));

export const DataValuePanelBrowseLinkStyled = styled('span')(({ theme }) => ({
  color: theme.palette.primary.main
}));

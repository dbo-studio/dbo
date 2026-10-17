import { Box, styled } from '@mui/material';

export const PaneStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'focused'
})<{ focused: boolean }>(({ theme, focused }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
  boxShadow: focused ? `inset 0 2px 0 ${theme.palette.primary.main}` : 'none',
  '&[data-pane="1"]': {
    borderLeft: `1px solid ${theme.palette.divider}`
  }
}));

export const PaneSplitStyled = styled(Box)({
  display: 'flex',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden'
});

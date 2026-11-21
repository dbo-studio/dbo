import { Box, styled } from '@mui/material';

export const TimelineStripStyled = styled(Box)({
  display: 'flex',
  gap: '2px'
});

export const TimelineCellStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'kept'
})<{ kept: boolean }>(({ theme, kept }) => ({
  flex: 1,
  height: 18,
  backgroundColor: kept ? theme.palette.primary.main : theme.palette.action.hover,
  opacity: kept ? 1 : 0.6
}));

export const TimelineLabelsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(0.5)
}));

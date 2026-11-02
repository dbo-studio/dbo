import { Box, styled } from '@mui/material';

export const GeometryValueColumnStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(1)
}));

export const GeometryMapFrameStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 160
}));

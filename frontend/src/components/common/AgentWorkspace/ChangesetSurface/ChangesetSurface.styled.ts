import { Box, styled } from '@mui/material';

export const ChangesetSurfaceStyled = styled(Box)(({ theme }) => ({
  width: 440,
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

export const ChangesetSurfaceHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: `${theme.spacing(0.5)} ${theme.spacing(1.5)}`,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const ChangesetSurfaceBodyStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing(1.5)
}));

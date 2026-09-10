import { Box, styled } from '@mui/material';

export const MenuPanelStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  overflow: 'auto',
  background: theme.palette.background.subdued,
  flex: 1,
  minHeight: 0
})) as typeof Box;

export const MenuPanelGroupLabelStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 1, 0.5),
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: theme.palette.text.secondary
}));

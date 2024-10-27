import { Box, styled } from '@mui/material';

export const MenuPanelStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'auto',
  background: theme.palette.background.subdued,
  flex: 1
})) as typeof Box;

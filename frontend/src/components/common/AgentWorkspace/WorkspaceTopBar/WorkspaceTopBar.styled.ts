import { Box, styled } from '@mui/material';

export const WorkspaceTopBarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  height: 48,
  flexShrink: 0,
  padding: `0 ${theme.spacing(1.5)}`,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

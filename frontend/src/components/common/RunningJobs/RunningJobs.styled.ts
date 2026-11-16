import { Box, styled } from '@mui/material';

export const RunningJobRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  padding: theme.spacing(1.25, 1.5),
  cursor: 'pointer',
  '&:hover': { background: theme.palette.action.hover },
  '& + &': { borderTop: `1px solid ${theme.palette.divider}` }
}));

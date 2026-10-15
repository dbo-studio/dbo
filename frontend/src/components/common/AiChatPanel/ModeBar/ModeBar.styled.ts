import { Box, styled } from '@mui/material';

export const ModeBarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  padding: `${theme.spacing(0.75)} 0`,
  flexShrink: 0,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0, 0, 1),
    '& .MuiToggleButtonGroup-root': { flex: 1 },
    '& .MuiToggleButton-root': { flex: 1 }
  },
  '& .MuiToggleButton-root': {
    padding: `${theme.spacing(0.125)} ${theme.spacing(1.25)}`,
    fontSize: '0.75rem',
    textTransform: 'none',
    lineHeight: 1.6
  }
}));

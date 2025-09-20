import { Grid, styled } from '@mui/material';

export const AppHeaderStyled = styled(Grid)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  paddingRight: theme.spacing(2),
  paddingLeft: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: 'transparent',
  backdropFilter: 'blur(15px)',
  WebkitBackdropFilter: 'blur(15px)',
  position: 'relative',
  zIndex: 101
}));

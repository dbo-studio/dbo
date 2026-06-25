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
  zIndex: 101,
  justifyContent: 'space-between'
}));

export const AppHeaderGridStyled = styled(Grid)(({ useCompactHeader }: { useCompactHeader: boolean }) => ({
  display: useCompactHeader ? 'flex' : 'none',
  justifyContent: 'flex-start',
  alignItems: 'center',
  flexShrink: 0
}));

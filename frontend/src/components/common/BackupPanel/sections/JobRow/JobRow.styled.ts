import { Box, styled } from '@mui/material';

export const JobRowRootStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const JobRowMainStyled = styled(Box)({
  flex: 2,
  minWidth: 0
});

export const JobRowFlexStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'flexGrow'
})<{ flexGrow: number }>(({ flexGrow }) => ({
  flex: flexGrow
}));

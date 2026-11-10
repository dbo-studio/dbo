import { Box, styled } from '@mui/material';

export const MobileConnectionListStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto'
});

export const MobileConnectionListSearchStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2)
}));

export const ConnectionStatusDotStyled = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
  backgroundColor: theme.palette.success.main
}));

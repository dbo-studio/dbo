import { Box, styled } from '@mui/material';

export const MobileTreeListStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto'
});

export const MobileTreeListSearchStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2)
}));

export const MobileTreeListMessageStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center'
}));

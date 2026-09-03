import { Box, styled } from '@mui/material';

export const QueryContainerStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden'
});

export const QueryEditorBoxStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: 0,
  flex: 1,
  overflow: 'hidden',
  borderBottom: `1px solid ${theme.palette.divider}`
}));

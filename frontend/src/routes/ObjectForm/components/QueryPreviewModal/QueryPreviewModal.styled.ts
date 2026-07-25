import { Box, styled } from '@mui/material';

export const QueryPreviewContentStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1
}));

export const QueryPreviewActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing(2),
  justifyContent: 'space-between'
}));

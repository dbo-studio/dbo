import { Box, styled } from '@mui/material';

export const QuickViewDialogContainerStyled = styled(Box)(() => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column'
}));

export const QuickViewDialogEditorStyled = styled(Box)(() => ({
  overflow: 'auto',
  display: 'flex',
  flex: 1
}));

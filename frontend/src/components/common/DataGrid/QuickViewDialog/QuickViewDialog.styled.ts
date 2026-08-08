import { Box, styled } from '@mui/material';

export const QuickViewDialogContainerStyled = styled(Box)(() => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column'
}));

export const QuickViewDialogEditorStyled = styled(Box)(() => ({
  overflow: 'hidden',
  display: 'flex',
  flex: 1,
  minHeight: 0,
  flexDirection: 'column'
}));

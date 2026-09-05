import { styled } from '@mui/material';
import { Box } from '@mui/system';

export const UpdateDialogContentStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto'
}));

export const UpdateDialogStyled = styled(Box)(({ theme }) => ({
  minHeight: 80,
  maxWidth: 600,
  '& *': {
    color: theme.palette.text.text
  }
}));

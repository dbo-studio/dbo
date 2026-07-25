import { styled } from '@mui/material';
import { Box } from '@mui/system';

export const UpdateDialogContentStyled = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'scroll'
}));

export const UpdateDialogStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 80,
  maxWidth: 600,
  '& *': {
    color: theme.palette.text.text
  }
}));

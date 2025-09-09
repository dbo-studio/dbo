import { styled } from '@mui/material';
import { Box } from '@mui/system';

export const UpdateDialogStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 80,
  maxWidth: 600,
  '& *': {
    color: theme.palette.text.text
  }
}));

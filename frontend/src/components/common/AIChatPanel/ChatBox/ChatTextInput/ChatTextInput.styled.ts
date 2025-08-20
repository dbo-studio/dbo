import { styled, TextareaAutosize } from '@mui/material';

export const ChatTextInputStyled = styled(TextareaAutosize)(({ theme }) => ({
  fontSize: theme.typography.caption.fontSize,
  backgroundColor: theme.palette.background.default,
  '&::placeholder': {
    color: theme.palette.text.disabled
  },
  fontFamily: theme.typography.fontFamily,
  width: '100%',
  border: 'none',
  outline: 'none',
  resize: 'none',
  maxHeight: '300px'
}));

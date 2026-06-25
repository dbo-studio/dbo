import { styled, TextareaAutosize } from '@mui/material';

export const ChatTextInputStyled = styled(TextareaAutosize)(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
  lineHeight: 1.5,
  backgroundColor: 'transparent',
  '&::placeholder': {
    color: theme.palette.text.disabled
  },
  fontFamily: theme.typography.fontFamily,
  width: '100%',
  border: 'none',
  outline: 'none',
  resize: 'none',
  maxHeight: '160px',
  minHeight: '40px',
  color: theme.palette.text.text,
  padding: 0
}));

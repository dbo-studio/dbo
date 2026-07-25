import { Button, Stack, styled } from '@mui/material';

export const InlineQueryStackStyled = styled(Stack)(() => ({
  flex: 1,
  minWidth: 0,
  alignItems: 'center'
}));

export const SubmitButtonStyled = styled(Button)(({ theme }) => ({
  width: '24px',
  height: '24px',
  padding: '5px',
  minWidth: 'unset',
  marginLeft: theme.spacing(1),
  borderRadius: 100,
  boxShadow: 'none',
  '& svg': {
    color: (theme.palette.mode === 'light' ? '#fff' : theme.palette.text.subdued) + ' !important'
  }
}));

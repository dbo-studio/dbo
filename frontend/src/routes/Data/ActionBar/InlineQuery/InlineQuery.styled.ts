import { Button, styled } from '@mui/material';

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

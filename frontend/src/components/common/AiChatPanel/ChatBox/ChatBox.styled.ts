import { variables } from '@/core/theme/variables';
import { Box, Button, styled } from '@mui/material';

export const ChatBoxStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  width: '100%',
  marginTop: theme.spacing(1),
  maxHeight: '300px'
}));

export const SendButtonStyled = styled(Button)(({ theme }) => ({
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

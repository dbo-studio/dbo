import { variables } from '@/core/theme/variables';
import { Box, Button, styled } from '@mui/material';

export const ChatBoxStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  width: '100%',
  maxHeight: '280px',
  boxShadow: theme.palette.mode === 'light' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none'
}));

export const SendButtonStyled = styled(Button)(({ theme }) => ({
  width: '28px',
  height: '28px',
  padding: theme.spacing(0.5),
  minWidth: 'unset',
  flexShrink: 0,
  borderRadius: '50%',
  boxShadow: 'none',
  '& svg': {
    color: `${theme.palette.primary.contrastText} !important`
  }
}));

export const ComposerFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: theme.spacing(0.5),
  minWidth: 0
}));

import { alpha, Box, Button, styled } from '@mui/material';

export const ChatBoxStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 16,
  padding: theme.spacing(1.25, 1.5, 1),
  backgroundColor: theme.palette.background.paper,
  width: '100%',
  maxHeight: '320px',
  boxShadow: theme.palette.mode === 'light' ? `0 1px 3px ${alpha(theme.palette.common.black, 0.04)}` : 'none',
  transition: 'border-color 120ms ease, box-shadow 120ms ease',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`
  }
}));

export const SendButtonStyled = styled(Button)(({ theme }) => ({
  width: '32px',
  height: '32px',
  padding: theme.spacing(0.5),
  minWidth: 'unset',
  flexShrink: 0,
  borderRadius: '50%',
  boxShadow: 'none',
  '& svg': {
    color: `${theme.palette.primary.contrastText} !important`
  },
  // contrastText matches the filled primary circle. The disabled fill is a neutral wash,
  // so the arrow uses muted text or it disappears (dark contrast on a dark disc).
  '&&.Mui-disabled': {
    backgroundColor: alpha(theme.palette.text.primary, 0.16),
    '& svg': {
      color: `${theme.palette.text.secondary} !important`
    }
  }
}));

export const ComposerFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  minWidth: 0,
  width: '100%'
}));

/** One field: chips wrap on their own row, the textarea stays full width underneath. */
export const ComposerFieldStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: theme.spacing(0.5),
  width: '100%',
  minWidth: 0
}));

export const PinnedPlanStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  minWidth: 0,
  padding: theme.spacing(0.25, 0.5),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

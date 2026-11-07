import { Stack, styled } from '@mui/material';

type StatusBarStyledProps = {
  mobile?: boolean;
};

export const StatusBarStyled = styled(Stack, {
  shouldForwardProp: (prop) => prop !== 'mobile'
})<StatusBarStyledProps>(({ theme, mobile }) => ({
  background: theme.palette.background.default,
  width: '100%',
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: mobile ? theme.spacing(0.5, 1) : theme.spacing(0.5, 1),
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
  minWidth: 0,
  ...(mobile && {
    overflowX: 'auto',
    flexWrap: 'nowrap',
    gap: theme.spacing(1),
    WebkitOverflowScrolling: 'touch',
    '& .MuiIconButton-root': {
      padding: theme.spacing(0.75)
    }
  })
}));

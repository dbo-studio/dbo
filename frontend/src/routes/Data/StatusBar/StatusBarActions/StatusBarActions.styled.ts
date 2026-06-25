import { Stack, styled } from '@mui/material';

type StatusBarActionsStackStyledProps = {
  mobile?: boolean;
};

export const StatusBarActionsStackStyled = styled(Stack, {
  shouldForwardProp: (prop) => prop !== 'mobile'
})<StatusBarActionsStackStyledProps>(({ mobile }) => ({
  alignItems: 'center',
  flexDirection: 'row',
  flexShrink: 0,
  justifyContent: mobile ? 'flex-start' : 'space-between',
  width: mobile ? 'auto' : 208
}));

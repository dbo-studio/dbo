import { Box, Stack, styled } from '@mui/material';

export const ShareRowRootStyled = styled(Box)(({ theme }) => ({
  paddingLeft: theme.spacing(1.5),
  paddingRight: theme.spacing(1.5),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1)
}));

export const ShareRowHeaderStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1.5)
}));

export const ShareStatusDotStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status'
})<{ status: 'active' | 'expired' | 'revoked' }>(({ theme, status }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
  backgroundColor:
    status === 'active'
      ? theme.palette.success.main
      : status === 'expired'
        ? theme.palette.warning.main
        : theme.palette.text.disabled
}));

export const ShareRowMainStyled = styled(Box)({
  flex: 1,
  minWidth: 0
});

export const ShareRowTitleStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1)
}));

export const ShareRowEditStyled = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  paddingLeft: theme.spacing(2.5)
}));

export const ShareVisitsStyled = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(0.25),
  marginTop: theme.spacing(1),
  paddingLeft: theme.spacing(2.5)
}));

export const ShareFieldGrowStyled = styled(Box)({
  flex: 1
});

export const ShareEditActionsStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  gap: theme.spacing(1),
  justifyContent: 'flex-end'
}));

import { Box, Stack, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const ShareFormBodyStyled = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(2.5),
  width: 520,
  maxWidth: '100%'
}));

export const ShareLoadingStyled = styled(Box)(({ theme }) => ({
  display: 'grid',
  placeItems: 'center',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4)
}));

export const ShareCreatedStyled = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1),
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: variables.radius.small,
  padding: theme.spacing(1.5)
}));

export const ShareCreatedRowStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1)
}));

export const ShareLinkGrowStyled = styled(Box)({
  flex: 1,
  minWidth: 0
});

export const ShareFieldGrowStyled = styled(Box)({
  flex: 1
});

export const ShareListStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.small,
  '& > :not(:last-child)': {
    borderBottom: `1px solid ${theme.palette.divider}`
  }
}));

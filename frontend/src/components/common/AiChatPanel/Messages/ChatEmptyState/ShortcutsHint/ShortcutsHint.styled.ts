import { variables } from '@/core/theme/variables';
import { Stack, Typography, styled } from '@mui/material';

export const ShortcutsRowStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: theme.spacing(1.5)
}));

export const ShortcutStyled = styled(Typography)(({ theme }) => ({
  display: 'inline-flex',
  gap: theme.spacing(0.5),
  alignItems: 'center'
}));

export const KbdStyled = styled('kbd')(({ theme }) => ({
  fontFamily: 'inherit',
  fontSize: variables.fontSize.xxs,
  lineHeight: 1,
  padding: theme.spacing(0.25, 0.5),
  borderRadius: variables.radius.small,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary
}));

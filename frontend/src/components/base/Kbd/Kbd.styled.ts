import { variables } from '@/core/theme/variables';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

export const KbdGroupStyled = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.25),
  '& > *:not(:last-child)::after': {
    marginLeft: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    fontWeight: 400
  }
}));

export const KbdStyled = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(0.25, 0.5),
  fontSize: theme.typography.body2.fontSize,
  fontWeight: 500,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  lineHeight: 1,
  color: theme.palette.text.title,
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderBottomWidth: 2,
  borderRadius: variables.radius.small,
  minWidth: '1.5rem',
  height: '1.5rem'
}));

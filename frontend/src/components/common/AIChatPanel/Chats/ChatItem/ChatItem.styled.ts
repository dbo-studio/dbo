import { styled } from '@mui/material/styles';
import { variables } from '@/core/theme/variables';

export const ChatItemStyled = styled('div')<{ selected: boolean }>(({ selected, theme }) => ({
  maxWidth: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'start',
  padding: `0 ${theme.spacing(1)}`,
  borderRadius: variables.radius.small,
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.background.default,
  color: selected ? theme.palette.background.default : theme.palette.text.text,
  cursor: 'pointer',
  marginRight: theme.spacing(1)
}));

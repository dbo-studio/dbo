import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { variables } from '@/core/theme/variables';
import { styled } from '@mui/material/styles';

export const ChatItemStyled = styled('div')<{ selected: boolean }>(({ selected, theme }) => ({
  maxWidth: 140,
  minWidth: 72,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'start',
  padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
  paddingRight: theme.spacing(2.5),
  borderRadius: variables.radius.small,
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  color: theme.palette.text.text,
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  cursor: 'pointer',
  marginRight: theme.spacing(0.5),
  position: 'relative',
  transition: 'border-color 0.15s ease, background-color 0.15s ease',
  '&:hover': {
    backgroundColor: selected ? theme.palette.action.selected : theme.palette.action.hover,
    '& svg': {
      opacity: 1
    }
  }
}));

export const ChatItemIconStyled = styled(CustomIcon)<{ selected: boolean }>(({ theme, selected }) => ({
  position: 'absolute',
  right: 4,
  top: '50%',
  transform: 'translateY(-50%)',
  borderRadius: '50%',
  opacity: selected ? 0.7 : 0,
  transition: 'opacity 0.15s ease',
  color: `${theme.palette.text.subdued} !important`,
  '&:hover': {
    color: `${theme.palette.text.text} !important`
  }
}));

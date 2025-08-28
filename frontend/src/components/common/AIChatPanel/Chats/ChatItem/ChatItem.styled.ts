import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { variables } from '@/core/theme/variables';
import { styled } from '@mui/material/styles';

export const ChatItemStyled = styled('div')<{ selected: boolean }>(({ selected, theme }) => ({
  maxWidth: 150,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'start',
  padding: `0 ${theme.spacing(1)}`,
  borderRadius: variables.radius.small,
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.background.default,
  color: selected ? theme.palette.background.default : theme.palette.text.text,
  cursor: 'pointer',
  marginRight: theme.spacing(1),
  position: 'relative',
  '&:hover': {
    '& svg': {
      opacity: 1
    }
  }
}));

export const ChatItemIconStyled = styled(CustomIcon)<{ selected: boolean }>(({ theme, selected }) => ({
  position: 'absolute',
  right: 5,
  top: 2,
  borderRadius: '50%',
  opacity: 0,
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.background.default
}));

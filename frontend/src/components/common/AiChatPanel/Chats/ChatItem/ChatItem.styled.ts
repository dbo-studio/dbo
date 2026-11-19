import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { variables } from '@/core/theme/variables';
import { styled } from '@mui/material/styles';

export const ChatItemStyled = styled('div', {
  shouldForwardProp: (prop) => prop !== '$selected'
})<{ $selected: boolean }>(({ $selected, theme }) => ({
  maxWidth: 140,
  minWidth: 0,
  flex: '0 1 auto',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.25),
  height: variables.control,
  paddingInline: theme.spacing(1),
  borderRadius: variables.radius.small,
  backgroundColor: $selected ? theme.palette.action.selected : 'transparent',
  color: $selected ? theme.palette.text.text : theme.palette.text.subdued,
  cursor: 'pointer',
  position: 'relative',
  userSelect: 'none',
  transition: `color ${variables.motion.base} ${variables.motion.easing}, background-color ${variables.motion.base} ${variables.motion.easing}`,
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  '&:hover': {
    backgroundColor: $selected ? theme.palette.action.selected : theme.palette.action.hover,
    color: theme.palette.text.text,
    '& svg': {
      opacity: 1
    }
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1
  }
}));

export const ChatItemIconStyled = styled(CustomIcon, {
  shouldForwardProp: (prop) => prop !== '$selected'
})<{ $selected: boolean }>(({ $selected }) => ({
  flexShrink: 0,
  opacity: $selected ? 0.55 : 0,
  transition: `opacity ${variables.motion.fast} ${variables.motion.easing}`,
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  color: 'inherit !important'
}));

import { variables } from '@/core/theme/variables';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

export const NodeLabel = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'isFocused' && prop !== 'isSelected' && prop !== 'level'
})<{ isFocused?: boolean; isSelected?: boolean; level: number }>(({ theme, isFocused, isSelected, level }) => ({
  padding: theme.spacing(0.4),
  paddingLeft: `${level * 20}px`,
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  borderRadius: variables.radius.small,
  width: '100%',
  overflow: 'hidden',
  border: '1px solid transparent',
  height: '22px',
  transition: 'background-color 0.1s ease',
  position: 'relative',
  zIndex: 1,
  gap: theme.spacing(0.5),
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  },
  ...(isFocused && {
    backgroundColor: theme.palette.action.hover,
    '& p': {
      fontWeight: 500,
      color: theme.palette.text.primary
    }
  }),
  ...(isSelected && {
    backgroundColor: theme.palette.action.selected,
    '& p': {
      fontWeight: 500,
      color: theme.palette.primary.main
    },
    '&:hover': {
      backgroundColor: theme.palette.action.selected
    }
  })
}));

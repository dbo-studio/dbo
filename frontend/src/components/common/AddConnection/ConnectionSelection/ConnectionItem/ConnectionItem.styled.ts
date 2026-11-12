import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import type { ConnectionItemStyledProps } from '../../types';

export const ConnectionItemStyled = styled(Box)<ConnectionItemStyledProps>(({ theme, selected }) => ({
  borderRadius: variables.radius.medium,
  background: selected ? theme.palette.action.selected : 'unset',
  padding: theme.spacing(1),
  display: 'flex',
  width: '100%',
  minWidth: 0,
  // Top-aligned, so logos line up across a row whether a name takes one line or two.
  justifyContent: 'flex-start',
  alignItems: 'center',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  border: '1px solid',
  borderColor: selected ? theme.palette.primary.main : 'transparent',
  transition: `background-color ${variables.motion.fast} ${variables.motion.easing}, border-color ${variables.motion.fast} ${variables.motion.easing}`,
  ':hover': {
    borderColor: selected ? theme.palette.primary.main : theme.palette.divider
  },
  ':focus-visible': {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: 1
  },
  cursor: 'pointer',
  '& .MuiTypography-root': {
    textAlign: 'center',
    width: '100%',
    lineHeight: 1.25,
    wordBreak: 'break-word'
  }
}));

export const ConnectionItemLogoStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  width: 40,
  height: 40,
  flexShrink: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: variables.radius.small,
  background: theme.palette.mode === 'dark' ? theme.palette.background.subdued : theme.palette.grey[200],
  overflow: 'hidden',
  '& img': {
    maxWidth: 28,
    maxHeight: 28,
    objectFit: 'contain'
  }
}));

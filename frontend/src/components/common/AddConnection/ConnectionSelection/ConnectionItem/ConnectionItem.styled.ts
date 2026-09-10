import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import type { ConnectionItemStyledProps } from '../../types';

export const ConnectionItemStyled = styled(Box)<ConnectionItemStyledProps>(({ theme, selected }) => ({
  borderRadius: variables.radius.medium,
  background: selected ? theme.palette.background.paper : 'unset',
  padding: theme.spacing(1),
  display: 'flex',
  width: '100%',
  minWidth: 0,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  border: '1px solid',
  borderColor: selected ? theme.palette.divider : 'transparent',
  transition: 'background-color 0.2s linear',
  ':hover': {
    transition: 'border-color 0.3s ease',
    border: `1px solid ${theme.palette.divider}`
  },
  cursor: 'pointer',
  '& .MuiTypography-root': {
    textAlign: 'center',
    width: '100%',
    lineHeight: 1.25,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
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
  background: theme.palette.grey[200],
  overflow: 'hidden',
  '& img': {
    maxWidth: 28,
    maxHeight: 28,
    objectFit: 'contain'
  }
}));

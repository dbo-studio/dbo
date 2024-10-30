import type { PanelTabItemStyledProps } from '@/components/common/Panels/types.ts';
import { variables } from '@/core/theme/variables.ts';
import { Box, styled } from '@mui/material';

export const PanelTabItemStyled = styled(Box)<PanelTabItemStyledProps>(({ theme, selected }) => ({
  position: 'relative',
  height: 33,
  cursor: 'pointer',
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
  flex: 1,
  width: '250px',
  flexDirection: 'row',
  display: 'flex',
  span: {
    color: selected ? theme.palette.text.primary : theme.palette.text.subdued
  },

  svg: {
    opacity: 0,
    transition: 'opacity 0.1s'
  },

  '&:hover': {
    span: {
      color: theme.palette.text.text
    },

    svg: {
      opacity: 1,
      borderRadius: variables.radius.small,
      background: theme.palette.background.default,
      '&:hover': {
        border: `1px solid ${theme.palette.divider}`
      }
    }
  },
  '.indicator': {
    height: '1px',
    position: 'absolute',
    bottom: 2,
    right: 0,
    left: 0,
    backgroundColor: selected ? theme.palette.text.primary : 'transparent'
  }
}));

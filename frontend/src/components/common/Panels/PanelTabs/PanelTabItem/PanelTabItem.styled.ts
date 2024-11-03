import type { PanelTabItemStyledProps } from '@/components/common/Panels/types.ts';
import { variables } from '@/core/theme/variables.ts';
import { Box, styled } from '@mui/material';

export const PanelTabItemStyled = styled(Box)<PanelTabItemStyledProps>(({ theme, selected }) => ({
  position: 'relative',
  height: 35,
  cursor: 'pointer',
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
  flex: 1,
  width: '250px',
  flexDirection: 'row',
  background: theme.palette.background.default,
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
      color: selected ? theme.palette.text.primary : theme.palette.text.text
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
  borderBottom: selected ? `4px solid ${theme.palette.primary.main}` : `4px solid ${theme.palette.background.default}`
}));

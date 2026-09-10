import type { PanelTabItemStyledProps } from '@/components/common/Panels/types.ts';
import { variables } from '@/core/theme/variables.ts';
import { Box, styled, Typography, type TypographyProps } from '@mui/material';

export const PanelTabContentStyled = styled(Box)(() => ({
  display: 'flex',
  overflow: 'hidden',
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
  gap: 6
}));

export const PanelTabNameStyled = styled(Typography)<TypographyProps>(() => ({
  display: 'inline-block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '140px',
  lineHeight: 1.2
}));

export const PanelTabItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'compact' && prop !== 'selected'
})<PanelTabItemStyledProps>(({ theme, selected, compact }) => ({
  position: 'relative',
  height: 35,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: `${theme.spacing(1)} ${theme.spacing(compact ? 1.25 : 2)}`,
  flex: '0 1 auto',
  width: compact ? '160px' : '250px',
  minWidth: compact ? '120px' : '120px',
  maxWidth: compact ? '160px' : '250px',
  flexDirection: 'row',
  background: theme.palette.background.default,
  display: 'flex',
  userSelect: 'none',
  touchAction: 'pan-x',
  willChange: 'transform',
  cursor: 'default',
  span: {
    color: selected ? theme.palette.text.primary : theme.palette.text.subdued,
    fontWeight: selected ? theme.typography.fontWeightBold : theme.typography.fontWeightRegular
  },

  '> svg:last-of-type': {
    opacity: 0,
    transition: 'opacity 0.1s'
  },

  '&:hover': {
    span: {
      color: selected ? theme.palette.text.primary : theme.palette.text.text
    },

    '> svg:last-of-type': {
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

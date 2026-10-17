import { variables } from '@/core/theme/variables';
import { Box, ButtonBase, styled } from '@mui/material';
import type { RowCardBadgeStyledProps, RowCardStyledProps } from '../types';

export const RowCardStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'removed'
})<RowCardStyledProps>(({ theme, removed }) => ({
  display: 'block',
  width: '100%',
  textAlign: 'start',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(1, 1.5),
  opacity: removed ? 0.55 : 1,
  textDecoration: removed ? 'line-through' : 'none',
  '&:active': {
    backgroundColor: theme.palette.action.hover
  }
}));

export const RowCardHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  paddingBottom: theme.spacing(0.75),
  marginBottom: theme.spacing(0.75),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const RowCardKeyStyled = styled('span')(({ theme }) => ({
  fontFamily: theme.editorFontFamily,
  fontSize: variables.fontSize.md,
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.text.title,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}));

export const RowCardFieldStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'baseline',
  gap: theme.spacing(1),
  minWidth: 0,
  lineHeight: '20px'
}));

export const RowCardLabelStyled = styled('span')(({ theme }) => ({
  flexShrink: 0,
  width: '32%',
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.text.subdued,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}));

export const RowCardValueStyled = styled('span')(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  fontFamily: theme.editorFontFamily,
  fontSize: variables.fontSize.sm,
  color: theme.palette.text.text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}));

export const RowCardNullStyled = styled('span')(({ theme }) => ({
  fontStyle: 'italic',
  color: theme.palette.text.placeholder
}));

// Status colors match the desktop ConnectionBox (background.* with text.*).
export const RowCardBadgeStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone'
})<RowCardBadgeStyledProps>(({ theme, tone }) => ({
  flexShrink: 0,
  padding: '0 6px',
  borderRadius: variables.radius.small,
  fontSize: variables.fontSize.xxs,
  lineHeight: '18px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  backgroundColor: theme.palette.background[tone],
  color: theme.palette.text[tone]
}));

import { alpha, Box, ButtonBase, styled } from '@mui/material';

// Mirrors the desktop NavRail item: tinted background plus a primary bar on the leading edge when selected.
export const ListRowStyled = styled(ButtonBase)(({ theme }) => ({
  width: '100%',
  minHeight: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0.75, 2, 0.75, 1.625),
  textAlign: 'start',
  borderLeft: '3px solid transparent',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.text,
  '&:active': {
    backgroundColor: theme.palette.action.hover
  },
  '&[aria-selected="true"]': {
    borderLeftColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.text.primary
  }
}));

export const ListRowLeadingStyled = styled(Box)({
  display: 'flex',
  flexShrink: 0
});

export const ListRowBodyStyled = styled(Box)({
  flex: 1,
  minWidth: 0
});

export const ListRowTitleStyled = styled('span')(({ theme }) => ({
  display: 'block',
  fontSize: 14,
  lineHeight: '20px',
  color: 'inherit',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '[aria-selected="true"] &': {
    fontWeight: theme.typography.fontWeightMedium
  }
}));

export const ListRowSubtitleStyled = styled('span')(({ theme }) => ({
  display: 'block',
  fontSize: theme.typography.caption.fontSize,
  lineHeight: '16px',
  color: theme.palette.text.subdued,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}));

export const ListRowChevronStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexShrink: 0,
  color: theme.palette.text.subdued
}));

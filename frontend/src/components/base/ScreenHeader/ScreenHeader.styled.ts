import { Box, styled } from '@mui/material';

export const ScreenHeaderStyled = styled('header')(({ theme }) => ({
  flexShrink: 0,
  padding: theme.spacing(0, 1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.subdued
}));

export const ScreenHeaderRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  minHeight: 44
}));

export const ScreenHeaderTitleStyled = styled('h1')(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  margin: 0,
  padding: theme.spacing(0, 1),
  fontSize: 16,
  fontWeight: theme.typography.fontWeightBold,
  lineHeight: 1.3,
  color: theme.palette.text.title,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}));

export const ScreenHeaderActionsStyled = styled(Box)({
  display: 'flex',
  alignItems: 'center'
});

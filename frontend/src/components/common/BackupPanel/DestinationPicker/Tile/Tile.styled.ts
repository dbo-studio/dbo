import { Box, ButtonBase, Typography, styled } from '@mui/material';

export const TileButtonStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: theme.spacing(1),
  padding: theme.spacing(1.25),
  textAlign: 'left',
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  borderRadius: theme.shape.borderRadius / 2
}));

export const TileIconStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  color: selected ? theme.palette.primary.main : theme.palette.text.secondary
}));

export const TileBodyStyled = styled(Box)({
  minWidth: 0
});

export const TileTitleStyled = styled(Typography)({});

export const TileSubStyled = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'warn'
})<{ warn?: boolean }>(({ theme, warn }) => ({
  color: warn ? theme.palette.warning.main : theme.palette.text.secondary
}));
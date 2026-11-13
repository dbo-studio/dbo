import { variables } from '@/core/theme/variables';
import { Box, ButtonBase, styled, Typography } from '@mui/material';

export const CatalogRootStyled = styled(Box)(({ theme }) => ({
  width: 240,
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  borderRight: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  [theme.breakpoints.down('md')]: {
    width: '100%',
    maxHeight: 200,
    borderRight: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`
  }
}));

export const CatalogListStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1)
}));

export const CatalogGroupLabelStyled = styled(Typography)(({ theme }) => ({
  display: 'block',
  padding: theme.spacing(0.5, 1),
  color: theme.palette.text.subdued,
  lineHeight: 1.6
}));

export const CatalogItemStyled = styled(ButtonBase, { shouldForwardProp: (p) => p !== 'selected' })<{
  selected: boolean;
}>(({ theme, selected }) => ({
  width: '100%',
  justifyContent: 'flex-start',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  minHeight: 32,
  borderRadius: variables.radius.small,
  textAlign: 'left',
  background: selected ? theme.palette.action.selected : 'transparent',
  boxShadow: selected ? `inset 2px 0 0 ${theme.palette.primary.main}` : 'none',
  '&:hover': { background: selected ? theme.palette.action.selected : theme.palette.action.hover },
  '&.Mui-focusVisible': { outline: `1px solid ${theme.palette.primary.main}`, outlineOffset: -1 }
}));

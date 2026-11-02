import { Box, styled } from '@mui/material';

export const BoardsListStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  flex: 1,
  minHeight: 0,
  overflow: 'auto'
}));

export const BoardsSectionHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  height: 28,
  paddingLeft: theme.spacing(0.5),
  cursor: 'pointer',
  userSelect: 'none',
  color: theme.palette.text.subdued,
  '&:hover': { color: theme.palette.text.text }
}));

export const BoardsItemStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  height: 28,
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  userSelect: 'none',
  '&:hover': { backgroundColor: theme.palette.action.hover },
  '&:focus-visible': { outline: `1px solid ${theme.palette.primary.main}`, outlineOffset: -1 }
}));

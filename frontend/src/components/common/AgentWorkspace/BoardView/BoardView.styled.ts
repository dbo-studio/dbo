import { Box, Stack, styled } from '@mui/material';

export const BoardRootStyled = styled(Stack)({
  height: '100%',
  minHeight: 0
});

export const BoardCanvasStyled = styled(Stack)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing(2),
  gap: theme.spacing(1)
}));

export const BoardGridStyled = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: theme.spacing(1)
}));

export const BoardFiltersStyled = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: theme.spacing(1)
}));
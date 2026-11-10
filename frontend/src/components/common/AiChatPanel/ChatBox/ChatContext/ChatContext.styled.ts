import { Box, Typography, type TypographyProps } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ChatContextStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  minWidth: 0
}));

// Two rows at most; more chips scroll inside, without a scrollbar, so the composer keeps its height.
export const ChatContextTagsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  alignContent: 'flex-start',
  gap: theme.spacing(0.5),
  maxHeight: 48,
  overflowY: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' }
}));

export const ChatContextItemNameStyled = styled(Typography)<TypographyProps>(() => ({
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0
}));

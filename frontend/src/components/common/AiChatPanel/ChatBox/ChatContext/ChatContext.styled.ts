import { Box, Typography, type TypographyProps } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ChatContextStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  width: '100%',
  minWidth: 0
}));

export const ChatContextTagsStyled = styled(Box)(() => ({
  display: 'contents'
}));

export const ChatContextItemNameStyled = styled(Typography)<TypographyProps>(() => ({
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0
}));

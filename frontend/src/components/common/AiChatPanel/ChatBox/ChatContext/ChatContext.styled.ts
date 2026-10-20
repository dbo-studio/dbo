import { Stack, Typography, type TypographyProps } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ChatContextTagsStyled = styled(Stack)(() => ({
  alignItems: 'center',
  justifyContent: 'flex-start',
  flexWrap: 'wrap',
  alignContent: 'center'
}));

export const ChatContextItemNameStyled = styled(Typography)<TypographyProps>(() => ({
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0
}));

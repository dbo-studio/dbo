import { Typography } from '@mui/material';
import type { ChatItemProps } from '../../types';
import { ChatItemStyled } from './ChatItem.styled';

export default function ChatItem({ chat, selected, onClick }: ChatItemProps) {
  return (
    <ChatItemStyled selected={selected} onClick={onClick}>
      <Typography variant='body2' noWrap>
        {chat.title}
      </Typography>
    </ChatItemStyled>
  );
}

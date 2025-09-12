import { Typography } from '@mui/material';
import type { MouseEvent } from 'react';
import type { ChatItemProps } from '../../types';
import { ChatItemIconStyled, ChatItemStyled } from './ChatItem.styled';

export default function ChatItem({ chat, selected, onClick, onDelete }: ChatItemProps) {
  const handleDeleteClick = (e: MouseEvent): void => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <ChatItemStyled selected={selected} onClick={onClick}>
      <Typography variant='body2' noWrap>
        {chat.title}
      </Typography>

      <ChatItemIconStyled type='close' onClick={handleDeleteClick} selected={selected} />
    </ChatItemStyled>
  );
}

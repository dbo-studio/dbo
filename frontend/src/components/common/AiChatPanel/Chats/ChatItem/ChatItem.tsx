import { Tooltip, Typography } from '@mui/material';
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
      <Tooltip title={chat.title} enterDelay={500}>
        <Typography variant='caption' noWrap sx={{ fontWeight: selected ? 600 : 400 }}>
          {chat.title}
        </Typography>
      </Tooltip>

      <ChatItemIconStyled type='close' onClick={handleDeleteClick} selected={selected} />
    </ChatItemStyled>
  );
}

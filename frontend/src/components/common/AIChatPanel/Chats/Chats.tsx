import api from '@/api';
import { Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { ChatProps } from '../types';

export default function Chats({ currentChat, onChatChange }: ChatProps) {
  const { data: chats } = useQuery({
    queryKey: ['aiChats'],
    queryFn: api.aiChat.getChats
  });

  return (
    <div>
      {chats?.map((chat) => (
        <Button
          key={chat.id}
          size='small'
          variant={String(currentChat?.id) === String(chat.id) ? 'contained' : 'text'}
          onClick={() => onChatChange(chat)}
        >
          {chat.title}
        </Button>
      ))}
    </div>
  );
}

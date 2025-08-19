import type { ChatProps } from '../types';
import ChatItem from './ChatItem/ChatItem';
import { ChatsStyled } from './Chats.styled';

export default function Chats({ chats, currentChat, onChatChange }: ChatProps) {
  return (
    <ChatsStyled>
      {chats?.map((chat) => (
        <ChatItem key={chat.id} chat={chat} selected={currentChat?.id === chat.id} onClick={() => onChatChange(chat)} />
      ))}
    </ChatsStyled>
  );
}

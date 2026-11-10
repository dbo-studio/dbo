import { ChatsProps } from '../types';
import ChatItem from './ChatItem/ChatItem';
import { ChatsStyled } from './Chats.styled';

export default function Chats({ currentChat, chats, onChatChange, onChatDelete, onChatRename }: ChatsProps) {
  return (
    <ChatsStyled>
      {chats?.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          selected={currentChat?.id === chat.id}
          onClick={() => onChatChange(chat)}
          onDelete={() => onChatDelete(chat)}
          onRename={(title) => onChatRename(chat, title)}
        />
      ))}
    </ChatsStyled>
  );
}

import { useAiStore } from '@/store/aiStore/ai.store';
import { useAiChat } from '../hooks/useAiChat';
import ChatItem from './ChatItem/ChatItem';
import { ChatsStyled } from './Chats.styled';

export default function Chats() {
  const currentChat = useAiStore((state) => state.currentChat);
  const chats = useAiStore((state) => state.chats);
  const { handleChatChange, handleChatDelete } = useAiChat();

  return (
    <ChatsStyled>
      {chats?.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          selected={currentChat?.id === chat.id}
          onClick={() => void handleChatChange(chat)}
          onDelete={() => void handleChatDelete(chat)}
        />
      ))}
    </ChatsStyled>
  );
}

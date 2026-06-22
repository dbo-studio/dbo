import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, Stack } from '@mui/material';
import AddChat from './AddChat/AddChat';
import { AiChatPanelContainerStyled, HeaderContainerStyled } from './AiChatPanel.styled';
import ChatBox from './ChatBox/ChatBox';
import ChatHistory from './ChatHistory/ChatHistory';
import Chats from './Chats/Chats';
import Messages from './Messages/Messages';
import { useAiChat } from './hooks/useAiChat';

export default function AiChatPanel() {
  const {
    autocomplete,
    chatPending,
    handleCancel,
    handleChatChange,
    handleCreateChat,
    handleLoadMore,
    handleSend,
    handleChatDelete
  } = useAiChat();

  const currentChat = useAiStore((state) => state.currentChat);
  const chats = useAiStore((state) => state.chats);

  return (
    <AiChatPanelContainerStyled>
      <HeaderContainerStyled>
        <Chats
          chats={chats ?? []}
          currentChat={currentChat}
          onChatChange={(chat) => void handleChatChange(chat)}
          onChatDelete={(chat) => void handleChatDelete(chat)}
        />
        <Stack
          direction={'row'}
          sx={{
            alignItems: 'center'
          }}
        >
          <AddChat onClick={() => void handleCreateChat()} />
          <ChatHistory />
        </Stack>
      </HeaderContainerStyled>
      <Messages loading={chatPending} messages={currentChat?.messages ?? []} onLoadMore={() => void handleLoadMore()} />
      <Box>
        {autocomplete && currentChat && (
          <ChatBox
            loading={chatPending}
            autocomplete={autocomplete}
            onSend={() => void handleSend()}
            onCancel={() => void handleCancel()}
          />
        )}
      </Box>
    </AiChatPanelContainerStyled>
  );
}

import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useEffect } from 'react';
import AddChat from './AddChat/AddChat';
import { AiChatPanelContainerStyled, ComposerContainerStyled, HeaderContainerStyled } from './AiChatPanel.styled';
import ChatBox from './ChatBox/ChatBox';
import ChatHistory from './ChatHistory/ChatHistory';
import Chats from './Chats/Chats';
import { useAiAutoContext } from './hooks/useAiAutoContext';
import { useAiChat } from './hooks/useAiChat';
import Messages from './Messages/Messages';

export default function AiChatPanel() {
  useAiAutoContext();

  const {
    autocomplete,
    chatPending,
    handleCancel,
    handleChatChange,
    handleCreateChat,
    handleLoadMore,
    handleSend,
    handleRetry,
    handleChatDelete
  } = useAiChat();

  const currentChat = useAiStore((state) => state.currentChat);
  const chats = useAiStore((state) => state.chats);
  const bridgeRequest = useAiStore((state) => state.bridgeRequest);
  const setBridgeRequest = useAiStore((state) => state.setBridgeRequest);
  const updateContext = useAiStore((state) => state.updateContext);
  const connectionId = useConnectionStore((state) => state.currentConnectionId);

  useEffect(() => {
    if (!bridgeRequest) return;

    const { message, autoSend, contextPatch } = bridgeRequest;
    setBridgeRequest(null);

    if (contextPatch) {
      updateContext({ ...useAiStore.getState().context, ...contextPatch });
    }
    if (message) {
      const nextContext = { ...useAiStore.getState().context, input: message };
      updateContext(nextContext);
      if (autoSend) {
        void handleSend(message);
      }
    }
  }, [bridgeRequest, handleSend, setBridgeRequest, updateContext]);

  return (
    <AiChatPanelContainerStyled>
      <HeaderContainerStyled>
        <Chats
          chats={chats ?? []}
          currentChat={currentChat}
          onChatChange={(chat) => void handleChatChange(chat)}
          onChatDelete={(chat) => void handleChatDelete(chat)}
        />
        <AddChat onClick={() => void handleCreateChat()} />
        <ChatHistory />
      </HeaderContainerStyled>
      <Messages
        loading={chatPending}
        messages={currentChat?.messages ?? []}
        onLoadMore={() => void handleLoadMore()}
        onSelectPrompt={(prompt) => void handleSend(prompt)}
        onRetry={() => void handleRetry()}
      />
      {connectionId && (
        <ComposerContainerStyled>
          <ChatBox
            loading={chatPending}
            autocomplete={autocomplete}
            onSend={() => void handleSend()}
            onCancel={() => void handleCancel()}
          />
        </ComposerContainerStyled>
      )}
    </AiChatPanelContainerStyled>
  );
}

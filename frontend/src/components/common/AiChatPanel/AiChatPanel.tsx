import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import AddChat from './AddChat/AddChat';
import { AiChatPanelContainerStyled, ComposerContainerStyled, HeaderContainerStyled } from './AiChatPanel.styled';
import ChatBox from './ChatBox/ChatBox';
import ChatHistory from './ChatHistory/ChatHistory';
import Chats from './Chats/Chats';
import { useAiAutoContext } from './hooks/useAiAutoContext';
import { useAiChat } from './hooks/useAiChat';
import Messages from './Messages/Messages';
import ModeBar from './ModeBar/ModeBar';

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
    handleRegenerate,
    handleChatDelete,
    handleChatRename
  } = useAiChat();

  const currentChat = useAiStore((state) => state.currentChat);
  const chats = useAiStore((state) => state.chats);
  const bridgeRequest = useAiStore((state) => state.bridgeRequest);
  const setBridgeRequest = useAiStore((state) => state.setBridgeRequest);
  const updateContext = useAiStore((state) => state.updateContext);
  const connectionId = useConnectionStore((state) => state.currentConnectionId);
  const updateUI = useSettingStore((state) => state.updateUI);

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
          onChatRename={(chat, title) => void handleChatRename(chat, title)}
        />
        <AddChat onClick={() => void handleCreateChat()} />
        <ChatHistory />
      </HeaderContainerStyled>
      {connectionId && <ModeBar />}
      {!connectionId ? (
        <Stack spacing={1.5} sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }} data-testid='ai-no-connection'>
          <CustomIcon type='connection' size='m' />
          <Typography variant='subtitle2'>{locales.ai_no_connection_title}</Typography>
          <Typography variant='caption' color='textSubdued' sx={{ maxWidth: 260 }}>
            {locales.ai_no_connection_subtitle}
          </Typography>
          <Button size='small' variant='outlined' onClick={() => updateUI({ showConnectionsDrawer: true })}>
            {locales.ai_select_connection}
          </Button>
        </Stack>
      ) : (
      <Messages
        loading={chatPending}
        messages={currentChat?.messages ?? []}
        onLoadMore={() => void handleLoadMore()}
        onSelectPrompt={(prompt) => void handleSend(prompt)}
        onRetry={() => void handleRetry()}
        onRegenerate={() => void handleRegenerate()}
      />
      )}
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

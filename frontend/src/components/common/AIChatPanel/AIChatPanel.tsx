import api from '@/api';
import type { AiChatRequest, AiContextOptsType } from '@/api/ai/types';
import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AiChatType, AutoCompleteType } from '@/types';
import { Box, LinearProgress, Stack } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import AddChat from './AddChat/AddChat';
import { HeaderContainerStyled } from './AiChatPanel.styled';
import ChatBox from './ChatBox/ChatBox';
import Chats from './Chats/Chats';
import Messages from './Messages/Messages';

export default function AiChatPanel() {
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const currentChat = useAiStore((state) => state.currentChat);
  const chats = useAiStore((state) => state.chats);
  const [page, setPage] = useState(1);

  const selectedTab = useSelectedTab();

  const updateChats = useAiStore((state) => state.updateChats);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);
  const addChat = useAiStore((state) => state.addChat);
  const addMessage = useAiStore((state) => state.addMessage);
  const updateContext = useAiStore((state) => state.updateContext);

  const { isLoading } = useQuery({
    queryKey: ['aiChats', currentConnectionId],
    queryFn: async () => {
      const chats = await api.aiChat.getChats({
        connectionId: currentConnectionId ?? 0,
        page: 1,
        count: 1
      });
      updateChats(chats);
      if (!currentChat) {
        if (chats.length > 0) {
          handleChatChange(chats[0]);
        } else {
          handleCreateChat();
        }
      }
      return chats;
    },
    enabled: !!currentConnectionId
  });

  const { mutateAsync: chatMutation, isPending: chatPending } = useMutation({
    mutationFn: api.ai.chat
  });

  const { data: autocomplete } = useQuery({
    queryKey: ['ai_autocomplete', currentConnectionId],
    queryFn: async (): Promise<AutoCompleteType> =>
      api.query.autoComplete({
        connectionId: Number(currentConnectionId),
        fromCache: true,
        skipSystem: true
      })
  });

  const { mutateAsync: createChatMutation } = useMutation({
    mutationFn: api.aiChat.createChat
  });

  const handleCreateChat = async (): Promise<void> => {
    try {
      const chat = await createChatMutation({
        connectionId: currentConnectionId ?? 0,
        title: locales.new_chat
      });

      addChat(chat);
      handleChatChange(chat);
    } catch (error) {
      console.debug('🚀 ~ handleCreateChat ~ error:', error);
    }
  };

  const handleChatChange = async (chat: AiChatType) => {
    if (chat.id === currentChat?.id) return;

    const detail = await api.aiChat.getChatDetail({
      id: chat.id,
      page: 1,
      count: 10
    });
    updateCurrentChat(detail);
  };

  const handleLoadMore = async (): Promise<void> => {
    if (!currentChat) return;

    setPage(page + 1);
    const detail = await api.aiChat.getChatDetail({
      id: currentChat.id,
      page: page + 1,
      count: 10
    });
    currentChat.messages.unshift(...detail.messages);
    updateCurrentChat(currentChat);
  };

  const handleSend = async () => {
    const context = useAiStore.getState().context;
    if (!currentChat || !context.input.trim() || chatPending) return;

    const contextOpts: AiContextOptsType = {
      database: context.database,
      schema: context.schema,
      tables: context.tables,
      views: context.views,
      query: ''
    };

    if (selectedTab?.mode === TabMode.Query) {
      contextOpts.query = useTabStore.getState().getQuery(selectedTab?.id);
    }

    addMessage(currentChat, [
      {
        role: 'user',
        content: context.input.trim(),
        createdAt: new Date().toISOString(),
        language: 'text',
        type: 'explanation',
        isNew: true
      }
    ]);

    updateContext({ ...context, input: '' });

    try {
      const chat = await chatMutation({
        connectionId: Number(currentConnectionId),
        chatId: currentChat?.id,
        message: context.input.trim(),
        contextOpts
      } as AiChatRequest);

      const updatedChat = addMessage(currentChat, chat.messages);
      updateCurrentChat({ ...updatedChat, title: chat.title });
    } catch (error) {
      console.debug('🚀 ~ handleSend ~ error:', error);
    }
  };

  const handleChatDelete = (chat: AiChatType) => {
    const newChats = chats.filter((c) => c.id !== chat.id);
    updateChats(newChats);

    if (currentChat?.id === chat.id) {
      if (newChats.length > 0) {
        handleChatChange(newChats[newChats.length - 1]);
        return;
      }

      handleCreateChat();
    }
  };

  if (isLoading) {
    return (
      <Box p={1}>
        <LinearProgress sx={{ height: 2 }} />
      </Box>
    );
  }

  return (
    <Box height={'100%'} minHeight={0} position={'relative'} display={'flex'} flexDirection={'column'}>
      <HeaderContainerStyled>
        <Chats
          chats={chats ?? []}
          currentChat={currentChat}
          onChatChange={handleChatChange}
          onChatDelete={handleChatDelete}
        />
        <Stack direction={'row'} alignItems={'center'}>
          {/* <ChatOptions /> */}
          <AddChat onClick={handleCreateChat} />
        </Stack>
      </HeaderContainerStyled>
      <Messages loading={chatPending} messages={currentChat?.messages ?? []} onLoadMore={handleLoadMore} />
      <Box>
        {autocomplete && currentChat && (
          <ChatBox loading={chatPending} onSend={handleSend} autocomplete={autocomplete} />
        )}
      </Box>
    </Box>
  );
}

import api from '@/api';
import { AiChatRequest, AiContextOptsType } from '@/api/ai/types';
import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { AiChatType, AutoCompleteType } from '@/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

type useAiChatReturnType = {
  autocomplete: AutoCompleteType | undefined;
  chatPending: boolean;
  handleCancel: () => void;
  handleCreateChat: () => Promise<void>;
  handleLoadMore: () => Promise<void>;
  handleSend: () => Promise<void>;
  handleChatChange: (chat: AiChatType) => Promise<void>;
  handleChatDelete: (chat: AiChatType) => Promise<void>;
};

export const useAiChat = (): useAiChatReturnType => {
  const [page, setPage] = useState(1);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedTab = useSelectedTab();

  const updateChats = useAiStore((state) => state.updateChats);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);
  const addChat = useAiStore((state) => state.addChat);
  const addMessage = useAiStore((state) => state.addMessage);
  const updateContext = useAiStore((state) => state.updateContext);

  const { mutateAsync: chatMutation, isPending: chatPending } = useMutation({
    mutationFn: async (data: AiChatRequest) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      return api.ai.chat(data, controller.signal);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    }
  });

  const { data: autocomplete } = useQuery({
    queryKey: ['ai_autocomplete', useConnectionStore.getState().currentConnectionId],
    queryFn: async (): Promise<AutoCompleteType> =>
      api.query.autoComplete({
        connectionId: Number(useConnectionStore.getState().currentConnectionId)
      })
  });

  const { mutateAsync: createChatMutation } = useMutation({
    mutationFn: api.aiChat.createChat
  });

  const handleCreateChat = async (): Promise<void> => {
    try {
      const chat = await createChatMutation({
        connectionId: useConnectionStore.getState().currentConnectionId ?? 0,
        title: locales.new_chat
      });

      addChat(chat);
      await handleChatChange(chat);
    } catch (error) {
      console.debug('🚀 ~ handleCreateChat ~ error:', error);
    }
  };

  const handleChatChange = useCallback(async (chat: AiChatType) => {
    if (chat.id === useAiStore.getState().currentChat?.id) return;

    const detail = await api.aiChat.getChatDetail({
      id: chat.id,
      page: 1,
      count: 10
    });
    updateCurrentChat(detail);
  }, []);

  const handleLoadMore = useCallback(async (): Promise<void> => {
    const currentChat = useAiStore.getState().currentChat;
    if (!currentChat) return;

    setPage(page + 1);
    const detail = await api.aiChat.getChatDetail({
      id: currentChat.id,
      page: page + 1,
      count: 10
    });
    currentChat.messages.unshift(...detail.messages);
    updateCurrentChat(currentChat);
  }, []);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleSend = async () => {
    const currentChat = useAiStore.getState().currentChat;
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

    const oldChat = addMessage(currentChat, [
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
        connectionId: Number(useConnectionStore.getState().currentConnectionId),
        chatId: currentChat?.id,
        message: context.input.trim(),
        contextOpts
      } as AiChatRequest);

      const updatedChat = addMessage(oldChat, chat.messages);
      if (chat.title !== oldChat.title) {
        updateCurrentChat({ ...updatedChat, title: chat.title });
      }
    } catch (error) {
      console.debug('🚀 ~ handleSend ~ error:', error);
    }
  };

  const handleChatDelete = useCallback(async (chat: AiChatType) => {
    const chats = useAiStore.getState().chats;
    const currentChat = useAiStore.getState().currentChat;

    const newChats = chats.filter((c) => c.id !== chat.id);
    updateChats(newChats);

    if (currentChat?.id === chat.id && newChats.length > 0) {
      await handleChatChange(newChats[newChats.length - 1]);
    } else if (newChats.length === 0) {
      updateCurrentChat(undefined);
    }
  }, []);

  return {
    autocomplete,
    chatPending,
    handleCancel,
    handleChatChange,
    handleCreateChat,
    handleLoadMore,
    handleSend,
    handleChatDelete
  };
};

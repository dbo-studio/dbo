import api from '@/api';
import { AiChatRequest, AiContextOptsType } from '@/api/ai/types';
import { TabMode } from '@/core/enums';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { AiChatType, AutoCompleteType } from '@/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useAiStream } from './useAiStream';

type useAiChatReturnType = {
  autocomplete: AutoCompleteType | undefined;
  chatPending: boolean;
  handleCancel: () => void;
  handleCreateChat: () => Promise<void>;
  handleLoadMore: () => Promise<void>;
  handleSend: (messageOverride?: string) => Promise<void>;
  handleRetry: () => Promise<void>;
  handleChatChange: (chat: AiChatType) => Promise<void>;
  handleChatDelete: (chat: AiChatType) => Promise<void>;
};

const buildContextOpts = (): AiContextOptsType => {
  const selectedTab = useTabStore.getState().selectedTab();
  const context = useAiStore.getState().context;

  const contextOpts: AiContextOptsType = {
    database: context.database,
    schema: context.schema,
    tables: context.tables,
    views: context.views
  };

  if (context.selectedQuery) {
    contextOpts.selectedQuery = context.selectedQuery;
    contextOpts.query = context.selectedQuery;
  } else if (selectedTab?.mode === TabMode.Query) {
    contextOpts.query = useTabStore.getState().getQuery(selectedTab?.id);
  }

  if (context.querySnippet) {
    contextOpts.query = context.querySnippet;
  }

  if (context.queryResultSummary) {
    contextOpts.queryResultSummary = context.queryResultSummary;
  }

  if (context.objectDefinition) {
    contextOpts.objectDefinition = context.objectDefinition;
  }

  return contextOpts;
};

export const useAiChat = (): useAiChatReturnType => {
  const [page, setPage] = useState(1);
  const [isFallbackPending, setIsFallbackPending] = useState(false);

  const connectionId = useConnectionStore((state) => state.currentConnectionId);

  const updateChats = useAiStore((state) => state.updateChats);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);
  const addChat = useAiStore((state) => state.addChat);
  const addMessage = useAiStore((state) => state.addMessage);
  const updateContext = useAiStore((state) => state.updateContext);
  const resetStreaming = useAiStore((state) => state.resetStreaming);

  const { isStreaming, sendStream, cancelStream } = useAiStream();

  const { data: autocomplete } = useQuery({
    queryKey: ['ai_autocomplete', connectionId],
    queryFn: async (): Promise<AutoCompleteType> =>
      api.query.autoComplete({
        connectionId: Number(connectionId)
      }),
    enabled: !!connectionId
  });

  const { mutateAsync: createChatMutation } = useMutation({
    mutationFn: api.aiChat.createChat
  });

  const chatPending = isStreaming || isFallbackPending;

  const handleCreateChat = async (): Promise<void> => {
    try {
      const chat = await createChatMutation({
        connectionId: Number(connectionId ?? 0),
        title: locales.new_chat
      });

      addChat(chat);
      await handleChatChange(chat);
    } catch (error) {
      console.debug('🚀 ~ handleCreateChat ~ error:', error);
    }
  };

  const handleChatChange = useCallback(
    async (chat: AiChatType) => {
      const currentChat = useAiStore.getState().currentChat;
      if (chat.id === currentChat?.id) return;

      resetStreaming();

      const detail = await api.aiChat.getChatDetail({
        id: chat.id,
        page: 1,
        count: 10
      });
      updateCurrentChat(detail);
    },
    [resetStreaming, updateCurrentChat]
  );

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
  }, [page, updateCurrentChat]);

  const handleCancel = useCallback(() => {
    cancelStream();
    setIsFallbackPending(false);
  }, [cancelStream]);

  const executeChat = useCallback(
    async (message: string, currentChat: AiChatType): Promise<void> => {
      const contextOpts = buildContextOpts();
      const request: AiChatRequest = {
        connectionId: Number(connectionId),
        chatId: Number(currentChat.id),
        message,
        contextOpts
      };

      const thinkingSnapshot = {
        content: '',
        durationMs: 0
      };

      try {
        const doneEvent = await sendStream(request);

        if (doneEvent?.type === 'done') {
          const streaming = useAiStore.getState().streaming;
          if (streaming.thinkingContent) {
            thinkingSnapshot.content = streaming.thinkingContent;
            thinkingSnapshot.durationMs = streaming.thinkingDurationMs ?? 0;
          }

          const messagesWithThinking = doneEvent.messages.map((msg, index) => {
            if (index === 0 && msg.role === 'assistant' && thinkingSnapshot.content) {
              return {
                ...msg,
                isNew: true,
                thinking: thinkingSnapshot
              };
            }
            return { ...msg, isNew: true };
          });

          const updatedChat = addMessage(currentChat, messagesWithThinking);
          if (doneEvent.title !== currentChat.title) {
            updateCurrentChat({ ...updatedChat, title: doneEvent.title });
          }
          resetStreaming();
          return;
        }

        if (useAiStore.getState().streaming.error) {
          return;
        }
      } catch {
        // fall through to non-stream fallback
      }

      try {
        setIsFallbackPending(true);
        const controller = new AbortController();
        const chat = await api.ai.chat(request, controller.signal);
        const updatedChat = addMessage(
          currentChat,
          chat.messages.map((m) => ({ ...m, isNew: true }))
        );
        if (chat.title !== currentChat.title) {
          updateCurrentChat({ ...updatedChat, title: chat.title });
        }
        resetStreaming();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        useAiStore.getState().updateStreaming({ error: message });
        console.debug('🚀 ~ executeChat ~ error:', error);
      } finally {
        setIsFallbackPending(false);
      }
    },
    [addMessage, connectionId, resetStreaming, sendStream, updateCurrentChat]
  );

  const handleSend = async (messageOverride?: string): Promise<void> => {
    let currentChat = useAiStore.getState().currentChat;
    const context = useAiStore.getState().context;
    const message = (messageOverride ?? context.input).trim();

    if (!message || chatPending) return;

    if (!currentChat) {
      await handleCreateChat();
      currentChat = useAiStore.getState().currentChat;
      if (!currentChat) return;
    }

    const oldChat = addMessage(currentChat, [
      {
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
        language: 'text',
        type: 'explanation',
        isNew: true
      }
    ]);

    if (!messageOverride) {
      updateContext({ ...context, input: '' });
    }

    await executeChat(message, oldChat);
  };

  const handleRetry = async (): Promise<void> => {
    const lastRequest = useAiStore.getState().streaming.lastRequest;
    const currentChat = useAiStore.getState().currentChat;
    if (!lastRequest || !currentChat) return;

    resetStreaming();
    await executeChat(lastRequest.message, currentChat);
  };

  const handleChatDelete = useCallback(
    async (chat: AiChatType) => {
      const chats = useAiStore.getState().chats;
      const currentChat = useAiStore.getState().currentChat;

      const newChats = chats.filter((c) => c.id !== chat.id);
      updateChats(newChats);

      if (currentChat?.id === chat.id && newChats.length > 0) {
        await handleChatChange(newChats[newChats.length - 1]);
      } else if (newChats.length === 0) {
        updateCurrentChat(undefined);
      }
    },
    [handleChatChange, updateChats, updateCurrentChat]
  );

  return {
    autocomplete,
    chatPending,
    handleCancel,
    handleChatChange,
    handleCreateChat,
    handleLoadMore,
    handleSend,
    handleRetry,
    handleChatDelete
  };
};

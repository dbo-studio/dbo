import api from '@/api';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { AiChatType } from '@/types';

/**
 * Makes `chat` the open chat. A chat with a turn still streaming is not saved
 * on the server yet, so it opens from memory; any other chat is read from the
 * server and starts clean (an old error does not follow the user back).
 */
export const openChat = async (chat: AiChatType): Promise<void> => {
  const { chats, sessions } = useAiStore.getState();
  const loaded = chats.find((item) => item.id === chat.id);
  const streaming = sessions[chat.id]?.streaming.status === 'streaming';

  const detail =
    loaded?.messages && streaming ? loaded : await api.aiChat.getChatDetail({ id: chat.id, page: 1, count: 10 });

  const { resetStreaming, markUnseen, updateCurrentChat } = useAiStore.getState();
  if (!streaming) resetStreaming(chat.id);
  markUnseen(chat.id, false);
  updateCurrentChat(detail);
  rememberChat(useConnectionStore.getState().currentConnectionId, chat.id);
};

const lastChatKey = (connectionId: string | number): string => `ai.lastChat.${connectionId}`;

/** Remembers the open chat of a connection, so a reload brings it back. Storage may be unavailable. */
export const rememberChat = (connectionId: string | number | undefined, chatId: number | undefined): void => {
  if (connectionId === undefined) return;
  try {
    if (chatId === undefined) localStorage.removeItem(lastChatKey(connectionId));
    else localStorage.setItem(lastChatKey(connectionId), String(chatId));
  } catch {
    /* the chat just does not come back after a reload */
  }
};

/** Reopens the chat that was open on this connection before a reload; a deleted one is forgotten. */
export const reopenLastChat = async (connectionId: string | number): Promise<void> => {
  let chatId: number;
  try {
    chatId = Number(localStorage.getItem(lastChatKey(connectionId)));
  } catch {
    return;
  }
  if (!chatId || useAiStore.getState().currentChat) return;

  try {
    await openChat(await api.aiChat.getChatDetail({ id: chatId, page: 1, count: 10 }));
  } catch {
    rememberChat(connectionId, undefined);
  }
};

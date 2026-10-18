import api from '@/api';
import { useAiStore } from '@/store/aiStore/ai.store';
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
};

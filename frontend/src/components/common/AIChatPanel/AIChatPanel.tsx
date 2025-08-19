import api from '@/api';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { AiChatType, AutoCompleteType } from '@/types';
import { Box, LinearProgress, Stack } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import AddChat from './AddChat/AddChat';
import ChatBox from './ChatBox/ChatBox';
import Chats from './Chats/Chats';
import DatabaseSchema from './DatabaseSchema/DatabaseSchema';
import Messages from './Messages/Messages';

export default function AIChatPanel() {
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const currentChat = useAiStore((state) => state.currentChat);
  const providers = useAiStore((state) => state.providers);
  const chats = useAiStore((state) => state.chats);

  const updateChats = useAiStore((state) => state.updateChats);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);
  const addChat = useAiStore((state) => state.addChat);

  const { isLoading } = useQuery({
    queryKey: ['aiChats', currentConnectionId],
    queryFn: async () => {
      const chats = await api.aiChat.getChats();
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
    mutationFn: api.aiChat.createChat,
    onError: (error: Error): void => {
      console.error('🚀 ~ createChatMutation ~ error:', error);
    }
  });

  const handleCreateChat = async (): Promise<void> => {
    if (!providers) return;

    const sortedProviders = providers.sort(
      (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
    );

    const chat = await createChatMutation({
      connectionId: currentConnectionId ?? 0,
      title: locales.new_chat,
      providerId: sortedProviders[0]?.id,
      model: sortedProviders[0]?.models?.[0]
    });

    addChat(chat);
    handleChatChange(chat);
  };

  const handleChatChange = async (chat: AiChatType) => {
    const detail = await api.aiChat.getChatDetail(chat.id);
    updateCurrentChat(detail);
  };

  return (
    <Box height={'100%'} display={'flex'} flexDirection={'column'}>
      {isLoading ? (
        <Box p={1}>
          <LinearProgress sx={{ height: 2 }} />
        </Box>
      ) : (
        <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'} pt={1} pb={1}>
          <Chats chats={chats ?? []} currentChat={currentChat} onChatChange={handleChatChange} />
          <Stack direction={'row'} gap={1} alignItems={'center'}>
            <AddChat onClick={handleCreateChat} />
          </Stack>
        </Stack>
      )}
      <Box flex={1} display={'flex'} flexDirection={'column'} justifyContent={'space-between'} height={'100%'}>
        <Messages messages={currentChat?.messages ?? []} />
        {autocomplete && <DatabaseSchema autocomplete={autocomplete} />}
        {autocomplete && currentChat && <ChatBox autocomplete={autocomplete} />}
      </Box>
    </Box>
  );
}

import api from '@/api';
import { useCurrentConnection } from '@/hooks';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import AddChat from './AddChat/AddChat';
import ChatBox from './ChatBox/ChatBox';
import Messages from './Messages/Messages';

export default function AIChatPanel() {
  const currentConnection = useCurrentConnection();
  const currentChat = useAiStore((state) => state.currentChat);
  const updateChats = useAiStore((state) => state.updateChats);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);

  useQuery({
    queryKey: ['aiChats', currentConnection?.id],
    queryFn: async () => {
      const chats = await api.aiChat.getChats();
      updateChats(chats);
      if (!currentChat && chats.length > 0) {
        const detail = await api.aiChat.getChatDetail(chats[0].id);
        updateCurrentChat(detail);
      }
      return chats;
    },
    enabled: !!currentConnection?.id
  });

  return (
    <Box height={'100%'} display={'flex'} flexDirection={'column'}>
      <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'} p={1}>
        <Typography variant='subtitle2'>AI Chat</Typography>
        <Stack direction={'row'} gap={1} alignItems={'center'}>
          <AddChat />
        </Stack>
      </Stack>
      <Box flex={1} display={'flex'} flexDirection={'column'} justifyContent={'space-between'} height={'100%'}>
        <Messages />
        <ChatBox />
      </Box>
    </Box>
  );
}

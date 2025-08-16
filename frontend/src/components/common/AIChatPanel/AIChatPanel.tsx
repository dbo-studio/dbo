import { chat as apiChat } from '@/api/ai';
import type { AIMessage } from '@/core/ai/types';
import { useCurrentConnection } from '@/hooks';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AIChat } from '@/types/AiChat';
import { Box, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import AddChat from './AddChat/AddChat';
import ChatBox from './ChatBox/ChatBox';
import Messages from './Messages/Messages';

type AIChatPanelProps = {
  context?: string;
};

export default function AIChatPanel({ context }: AIChatPanelProps) {
  const [currentChat, setCurrentChat] = useState<AIChat | undefined>(undefined);

  const { currentMessages, addMessageToCurrent } = useAiStore();
  const currentConnection = useCurrentConnection();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messages = currentMessages();

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: AIMessage = { role: 'user', content: input.trim() };
    addMessageToCurrent(userMsg);
    setInput('');
    setLoading(true);
    try {
      // pull current SQL editor content to send as extra system context
      const getQuery = useTabStore.getState().getQuery;
      const editorContent = getQuery?.() ?? '';
      const systemEditorContext: AIMessage | null = editorContent.trim()
        ? { role: 'system', content: `Editor content:\n${editorContent}` }
        : null;
      const res = await apiChat({
        connectionId: currentConnection?.id ?? 0,
        database: undefined,
        schema: undefined,
        messages: systemEditorContext ? [...messages, systemEditorContext, userMsg] : [...messages, userMsg],
        provider: {
          providerId: 'openai-compatible',
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens
        }
      });
      addMessageToCurrent(res.message as AIMessage);
    } catch (e) {
      addMessageToCurrent({ role: 'assistant', content: `خطا: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box height={'100%'} display={'flex'} flexDirection={'column'}>
      <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'} p={1}>
        <Typography variant='subtitle2'>AI Chat</Typography>
        <Stack direction={'row'} gap={1} alignItems={'center'}>
          <AddChat onChatAdd={setCurrentChat} />
        </Stack>
      </Stack>
      <Box flex={1} display={'flex'} flexDirection={'column'} justifyContent={'space-between'} height={'100%'}>
        <Messages messages={[]} />
        <ChatBox />
      </Box>
    </Box>
  );
}

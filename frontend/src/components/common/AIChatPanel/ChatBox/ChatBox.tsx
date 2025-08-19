import api from '@/api';
import type { AiChatRequest, AiContextOptsType } from '@/api/ai/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AutoCompleteType } from '@/types';
import { Box, CircularProgress, IconButton, Stack } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChatBoxStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import Providers from './Providers/Providers';

export default function ChatBox() {
  const currentConnection = useCurrentConnection();
  const selectedTab = useSelectedTab();
  const context = useAiStore((state) => state.context);
  const addMessage = useAiStore((state) => state.addMessage);

  const { data: autocomplete } = useQuery({
    queryKey: ['ai_autocomplete', currentConnection?.id],
    queryFn: async (): Promise<AutoCompleteType> =>
      api.query.autoComplete({
        connectionId: currentConnection?.id ?? 0,
        fromCache: true,
        skipSystem: true
      }),
    enabled: !!currentConnection
  });

  const { mutateAsync: chatMutation, isPending } = useMutation({
    mutationFn: api.ai.chat,
    onError: (error: Error): void => {
      console.log('🚀 ~ AIChatPanel ~ error:', error);
    }
  });

  const handleSend = async () => {
    if (!context.input.trim() || isPending || !context.database) return;

    const contextOpts: AiContextOptsType = {
      database: context.database,
      schema: context.schema,
      tables: context.tables,
      views: context.views
    };

    if (selectedTab?.mode === TabMode.Query && selectedTab?.query) {
      contextOpts.query = useTabStore.getState().getQuery(selectedTab?.id);
    }

    const chat = await chatMutation({
      connectionId: currentConnection?.id ?? 0,
      providerId: 1,
      model: 1,
      message: context.input.trim(),
      contextOpts
    } as AiChatRequest);

    console.log('🚀 ~ handleSend ~ chat:', chat);
  };

  return (
    <ChatBoxStyled>
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput onSend={handleSend} />
      <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Providers />
        {isPending ? (
          <Box pr={1}>
            <CircularProgress size={13} />
          </Box>
        ) : (
          <IconButton onClick={handleSend}>
            <CustomIcon type='arrowUp' />
          </IconButton>
        )}
      </Stack>
    </ChatBoxStyled>
  );
}

import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useCurrentConnection } from '@/hooks';
import type { AutoCompleteType } from '@/types';
import { IconButton, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ContextItemType } from '../types';
import { ChatBoxStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import Providers from './Providers/Providers';

export default function ChatBox() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextItems, setContextItems] = useState<Record<string, string[]>>({
    databases: [],
    schemas: [],
    tables: [],
    views: []
  });

  const currentConnection = useCurrentConnection();

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

  console.log(autocomplete);

  const handleSend = async () => {
    console.log('handleSend');
    if (!input.trim() || loading) return;
    setLoading(true);
  };

  const handleContextChange = (contextItems: Record<ContextItemType, string[]>) => {
    setContextItems(contextItems);
  };

  return (
    <ChatBoxStyled>
      {autocomplete && (
        <ChatContext autocomplete={autocomplete} contextItems={contextItems} onContextChange={handleContextChange} />
      )}
      <ChatTextInput value={input} onChange={setInput} onSend={handleSend} />
      <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Providers />
        <IconButton onClick={handleSend}>
          <CustomIcon type='arrowUp' />
        </IconButton>
      </Stack>
    </ChatBoxStyled>
  );
}

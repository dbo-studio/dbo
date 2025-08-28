import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import type { ChatTextInputProps } from '../../types';
import { ChatTextInputStyled } from './ChatTextInput.styled';

export default function ChatTextInput({ loading, onSend }: ChatTextInputProps) {
  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);

  const [input, setInput] = useState(context.input);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    updateContext({ ...context, input: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  useEffect(() => {
    if (context.input === '') {
      setInput('');
    }
  }, [context.input]);

  return (
    <Box flex={1} sx={{ overflowY: 'scroll' }}>
      <ChatTextInputStyled
        disabled={loading}
        placeholder={locales.ask_anything}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </Box>
  );
}

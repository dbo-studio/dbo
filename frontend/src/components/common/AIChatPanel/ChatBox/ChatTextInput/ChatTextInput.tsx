import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import type { ChatTextInputProps } from '../../types';
import { ChatTextInputStyled } from './ChatTextInput.styled';

export default function ChatTextInput({ onSend }: ChatTextInputProps) {
  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);

  const [input, setInput] = useState(context.input);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    updateContext({ ...context, input: e.target.value });
  };

  useEffect(() => {
    setInput(context.input);
  }, [context.input]);

  return (
    <Box flex={1} sx={{ overflowY: 'scroll' }}>
      <ChatTextInputStyled
        placeholder={locales.ask_anything}
        value={input}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
            updateContext({ ...context, input: '' });
            setInput('');
          }
        }}
      />
    </Box>
  );
}

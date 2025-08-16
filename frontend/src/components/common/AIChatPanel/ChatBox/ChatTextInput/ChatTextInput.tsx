import locales from '@/locales';
import { Box } from '@mui/material';
import type { ChatTextInputProps } from '../../types';
import { ChatTextInputStyled } from './ChatTextInput.styled';

export default function ChatTextInput({ value, onChange, onSend }: ChatTextInputProps) {
  return (
    <Box flex={1} sx={{ overflowY: 'scroll' }}>
      <ChatTextInputStyled
        placeholder={locales.ask_anything}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
    </Box>
  );
}

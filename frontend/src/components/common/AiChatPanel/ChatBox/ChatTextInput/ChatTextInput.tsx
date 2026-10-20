import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, Paper } from '@mui/material';
import { useMemo, useState } from 'react';
import type { ChatTextInputProps } from '../../types';
import { buildContextOptions, toggleContextOption, type ContextOption } from '../../utils/contextOptions';
import ContextPicker from '../ContextPicker/ContextPicker';
import { ChatTextInputStyled } from './ChatTextInput.styled';

type MentionState = {
  start: number;
  query: string;
};

function getMentionState(value: string, cursor: number): MentionState | null {
  const before = value.slice(0, cursor);
  const atIndex = before.lastIndexOf('@');
  // An @ inside a word (an email address) is not a mention.
  if (atIndex < 0 || (atIndex > 0 && !/\s/.test(before[atIndex - 1]))) return null;
  const fragment = before.slice(atIndex + 1);
  if (fragment.includes(' ') || fragment.includes('\n')) return null;
  return { start: atIndex, query: fragment.toLowerCase() };
}

export default function ChatTextInput({ loading, onSend, onCancel, autocomplete }: ChatTextInputProps) {
  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);
  const messageEdit = useAiStore((state) => state.messageEdit);
  const currentChat = useAiStore((state) => state.currentChat);

  const [input, setInput] = useState(() => context.input);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [activeOption, setActiveOption] = useState(0);
  const [prevMessageEdit, setPrevMessageEdit] = useState(messageEdit);

  if (messageEdit !== prevMessageEdit) {
    setPrevMessageEdit(messageEdit);
    setInput(context.input);
  } else if (context.input === '' && input !== '') {
    setInput('');
  }

  const mentionOptions = useMemo(
    () => (mention ? buildContextOptions(autocomplete, context, mention.query) : []),
    [autocomplete, context, mention]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setCursorPos(e.target.selectionStart ?? 0);
    updateContext({ ...context, input: e.target.value });
    setMention(getMentionState(e.target.value, e.target.selectionStart ?? 0));
    setActiveOption(0);
  };

  // The attached item shows as a chip, so the @ text is taken out of the message.
  const applyMention = (option: ContextOption) => {
    if (!mention) return;
    const next = input.slice(0, mention.start) + input.slice(cursorPos);
    setInput(next);
    updateContext({
      ...toggleContextOption(useAiStore.getState().context, { ...option, attached: false }),
      input: next
    });
    setMention(null);
  };

  const mentionOpen = mention !== null && mentionOptions.length > 0;
  const selectedOption = Math.min(activeOption, mentionOptions.length - 1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActiveOption((selectedOption + step + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        applyMention(mentionOptions[selectedOption]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Backspace') {
      e.preventDefault();
      setInput('');
      updateContext({ ...context, input: '' });
      return;
    }
    if (e.key === 'ArrowUp' && input === '' && !loading && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const userMessages = currentChat?.messages.filter((message) => message.role === 'user') ?? [];
      const lastUser = userMessages[userMessages.length - 1];
      if (lastUser) {
        e.preventDefault();
        setInput(lastUser.content);
        updateContext({ ...context, input: lastUser.content });
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (loading) {
        onCancel();
      } else {
        e.currentTarget.blur();
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Box sx={{ flex: 1, overflowY: 'scroll', position: 'relative' }}>
      {mention !== null && (
        <Paper sx={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 10, mb: 0.5 }}>
          <ContextPicker
            options={mentionOptions}
            activeIndex={selectedOption}
            onPick={applyMention}
            onHover={setActiveOption}
          />
        </Paper>
      )}
      <ChatTextInputStyled
        data-testid='ai-chat-input'
        readOnly={loading}
        placeholder={locales.ask_anything}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={(e) => {
          const target = e.target as HTMLTextAreaElement;
          setCursorPos(target.selectionStart ?? 0);
          setMention(getMentionState(target.value, target.selectionStart ?? 0));
        }}
      />
    </Box>
  );
}

import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, List, ListItemButton, Paper } from '@mui/material';
import { useMemo, useState } from 'react';
import type { ChatTextInputProps } from '../../types';
import type { AutoCompleteType } from '@/types';
import { ChatTextInputStyled } from './ChatTextInput.styled';

type MentionState = {
  start: number;
  query: string;
};

function getMentionState(value: string, cursor: number): MentionState | null {
  const before = value.slice(0, cursor);
  const atIndex = before.lastIndexOf('@');
  if (atIndex < 0) return null;
  const fragment = before.slice(atIndex + 1);
  if (fragment.includes(' ') || fragment.includes('\n')) return null;
  return { start: atIndex, query: fragment.toLowerCase() };
}

function buildMentionOptions(autocomplete: AutoCompleteType | undefined, query: string): string[] {
  if (!autocomplete) return [];
  const items = [
    ...autocomplete.tables.map((t) => ({ label: t, type: 'table' as const })),
    ...autocomplete.views.map((v) => ({ label: v, type: 'view' as const }))
  ];
  return items
    .filter((item) => item.label.toLowerCase().includes(query))
    .slice(0, 8)
    .map((item) => item.label);
}

export default function ChatTextInput({ loading, onSend, autocomplete }: ChatTextInputProps) {
  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);
  const messageEdit = useAiStore((state) => state.messageEdit);

  const [input, setInput] = useState(() => context.input);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [prevMessageEdit, setPrevMessageEdit] = useState(messageEdit);

  if (messageEdit !== prevMessageEdit) {
    setPrevMessageEdit(messageEdit);
    setInput(context.input);
  } else if (context.input === '' && input !== '') {
    setInput('');
  }

  const mentionOptions = useMemo(
    () => buildMentionOptions(autocomplete, mention?.query ?? ''),
    [autocomplete, mention?.query]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setCursorPos(e.target.selectionStart ?? 0);
    updateContext({ ...context, input: e.target.value });
    setMention(getMentionState(e.target.value, e.target.selectionStart ?? 0));
  };

  const applyMention = (name: string) => {
    if (!mention) return;
    const before = input.slice(0, mention.start);
    const after = input.slice(cursorPos);
    const next = `${before}@${name} ${after}`;
    setInput(next);
    updateContext({ ...context, input: next });
    const tables = context.tables.includes(name) ? context.tables : [...context.tables, name];
    updateContext({ ...useAiStore.getState().context, input: next, tables });
    setMention(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mention && mentionOptions.length > 0 && e.key === 'Tab') {
      e.preventDefault();
      applyMention(mentionOptions[0]);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Box sx={{ flex: 1, overflowY: 'scroll', position: 'relative' }}>
      {mention && mentionOptions.length > 0 && (
        <Paper sx={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 10, mb: 0.5 }}>
          <List dense>
            {mentionOptions.map((option) => (
              <ListItemButton key={option} onClick={() => applyMention(option)}>
                @{option}
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
      <ChatTextInputStyled
        disabled={loading}
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

import locales from '@/locales';
import { TabMode } from '@/core/enums';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { editor } from 'monaco-editor';
import { Box, List, ListItemButton, Paper } from '@mui/material';
import { useMemo, useState } from 'react';
import type { ChatTextInputProps } from '../../types';
import type { AiContextType, AutoCompleteType } from '@/types';
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

type MentionOption = {
  label: string;
  kind: 'table' | 'view' | 'schema' | 'query' | 'selection';
  /** Text applied to the context for query / selection mentions. */
  text?: string;
};

function getEditorSelection(): string {
  for (const instance of editor.getEditors()) {
    const selection = instance.getSelection();
    const model = instance.getModel();
    if (selection && !selection.isEmpty() && model) {
      return model.getValueInRange(selection);
    }
  }

  return '';
}

function getActiveQuery(): string {
  const tab = useTabStore.getState().selectedTab();
  return tab?.mode === TabMode.Query ? useTabStore.getState().getQuery(tab.id).trim() : '';
}

function buildMentionOptions(autocomplete: AutoCompleteType | undefined, query: string): MentionOption[] {
  const special: MentionOption[] = [];
  const activeQuery = getActiveQuery();
  if (activeQuery) special.push({ label: 'query', kind: 'query', text: activeQuery });
  const selection = getEditorSelection().trim();
  if (selection) special.push({ label: 'selection', kind: 'selection', text: selection });

  const objects: MentionOption[] = autocomplete
    ? [
        ...autocomplete.schemas.map((label) => ({ label, kind: 'schema' as const })),
        ...autocomplete.tables.map((label) => ({ label, kind: 'table' as const })),
        ...autocomplete.views.map((label) => ({ label, kind: 'view' as const }))
      ]
    : [];

  return [...special, ...objects].filter((item) => item.label.toLowerCase().includes(query)).slice(0, 10);
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
    () => buildMentionOptions(autocomplete, mention?.query ?? ''),
    [autocomplete, mention?.query]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setCursorPos(e.target.selectionStart ?? 0);
    updateContext({ ...context, input: e.target.value });
    setMention(getMentionState(e.target.value, e.target.selectionStart ?? 0));
    setActiveOption(0);
  };

  const applyMention = (option: MentionOption) => {
    if (!mention) return;
    const before = input.slice(0, mention.start);
    const after = input.slice(cursorPos);
    const next = `${before}@${option.label} ${after}`;
    setInput(next);

    const current = useAiStore.getState().context;
    const patch: Partial<AiContextType> = { input: next };
    switch (option.kind) {
      case 'table':
        patch.tables = current.tables.includes(option.label) ? current.tables : [...current.tables, option.label];
        break;
      case 'view':
        patch.views = current.views.includes(option.label) ? current.views : [...current.views, option.label];
        break;
      case 'schema':
        patch.schema = option.label;
        break;
      case 'query':
        patch.querySnippet = option.text;
        break;
      case 'selection':
        patch.selectedQuery = option.text;
        break;
    }
    updateContext({ ...current, ...patch });
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
      {mentionOpen && (
        <Paper sx={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 10, mb: 0.5 }}>
          <List dense>
            {mentionOptions.map((option, index) => (
              <ListItemButton
                key={`${option.kind}-${option.label}`}
                selected={index === selectedOption}
                onClick={() => applyMention(option)}
                data-testid='ai-mention-option'
                data-kind={option.kind}
              >
                @{option.label}
              </ListItemButton>
            ))}
          </List>
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

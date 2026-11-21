import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { cancelMessageEditOf, editingDraftOf, setEditingDraftOf } from '@/store/aiStore/editDraft';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box } from '@mui/material';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChatTextInputProps } from '../../types';
import {
  buildContextOptions,
  contextAfterConnectionPick,
  type ContextOption,
  tableGroupLabel,
  toggleContextOption
} from '../../utils/contextOptions';
import { useCurrentConnection } from '@/hooks';
import { useSwitchConnection } from '@/hooks/useSwitchConnection';
import ContextPicker from '../ContextPicker/ContextPicker';
import { ChatTextInputStyled } from './ChatTextInput.styled';
import {
  composerIsEmpty,
  createInlineChip,
  deleteMentionTrigger,
  hasChip,
  insertChipAtCaret,
  mentionAtCaret,
  readComposer,
  reconcileChips,
  stripTextKeepChips
} from './inlineChips';

export default function ChatTextInput({
  loading,
  onSend,
  onCancel,
  autocomplete,
  autoFocus,
  variant = 'footer'
}: ChatTextInputProps) {
  const isEdit = variant === 'edit';
  const context = useAiStore((state) => state.context);
  const editingDraft = useAiStore(editingDraftOf);
  const updateContext = useAiStore((state) => state.updateContext);
  const currentChat = useAiStore((state) => state.currentChat);
  const setEditingDraft = useAiStore(setEditingDraftOf);
  const cancelMessageEdit = useAiStore(cancelMessageEditOf);
  const draft = isEdit ? editingDraft : context.input;
  const editorRef = useRef<HTMLDivElement>(null);
  const lastTextRef = useRef(draft);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeOption, setActiveOption] = useState(0);

  const { switchConnection } = useSwitchConnection();
  const connections = useConnectionStore((state) => state.connections);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const tablesGroup = tableGroupLabel(useCurrentConnection()?.type);
  const mentionOptions = useMemo(
    () =>
      mentionQuery !== null
        ? buildContextOptions(autocomplete, context, mentionQuery, tablesGroup, connections ?? [], currentConnectionId)
        : [],
    [autocomplete, context, mentionQuery, tablesGroup, connections, currentConnectionId]
  );

  const syncFromEditor = (): void => {
    const root = editorRef.current;
    if (!root) return;
    const next = readComposer(root);
    lastTextRef.current = next.text;
    root.dataset.empty = composerIsEmpty(root) ? 'true' : 'false';
    root.dataset.composerText = next.text;
    const current = useAiStore.getState().context;
    if (isEdit) {
      setEditingDraft(next.text);
      updateContext({ ...current, tables: next.tables, views: next.views });
    } else {
      updateContext({ ...current, input: next.text, tables: next.tables, views: next.views });
    }
    const mention = mentionAtCaret(root);
    setMentionQuery(mention ? mention.query : null);
    setActiveOption(0);
  };

  useLayoutEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    if (composerIsEmpty(root) && draft) {
      lastTextRef.current = draft;
      root.append(document.createTextNode(draft));
    } else if (draft !== lastTextRef.current) {
      lastTextRef.current = draft;
      stripTextKeepChips(root);
      if (draft !== '') {
        root.append(document.createTextNode(draft));
      }
    }
    reconcileChips(root, context.tables, context.views, locales.ai_context_remove);
    root.dataset.empty = composerIsEmpty(root) ? 'true' : 'false';
    root.dataset.composerText = readComposer(root).text;
  }, [draft, context.tables, context.views]);

  useLayoutEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  const applyMention = (option: ContextOption) => {
    const root = editorRef.current;
    if (!root) return;
    const mention = mentionAtCaret(root);
    if (mention) deleteMentionTrigger(mention);

    if (option.kind === 'connection' && option.connection) {
      setMentionQuery(null);
      const text = readComposer(root).text;
      const current = useAiStore.getState().context;
      if (isEdit) {
        setEditingDraft(text);
        updateContext(contextAfterConnectionPick(current, current.input));
      } else {
        updateContext(contextAfterConnectionPick(current, text));
      }
      void switchConnection(option.connection);
      return;
    }

    if (option.kind === 'table' || option.kind === 'view') {
      if (!hasChip(root, option.label)) {
        const chip = createInlineChip(option.kind, option.label, locales.ai_context_remove);
        insertChipAtCaret(chip);
      }
      setMentionQuery(null);
      syncFromEditor();
      root.focus();
      return;
    }

    setMentionQuery(null);
    const text = readComposer(root).text;
    const current = useAiStore.getState().context;
    updateContext({
      ...toggleContextOption(current, { ...option, attached: false }),
      input: isEdit ? current.input : text
    });

    if (isEdit) setEditingDraft(text);
    lastTextRef.current = text;
  };

  const mentionOpen = mentionQuery !== null && mentionOptions.length > 0;
  const selectedOption = Math.min(activeOption, mentionOptions.length - 1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) return;
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
        setMentionQuery(null);
        return;
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Backspace') {
      e.preventDefault();
      const root = editorRef.current;
      if (!root) return;
      stripTextKeepChips(root);
      syncFromEditor();
      return;
    }
    const root = editorRef.current;
    const emptyText = root ? readComposer(root).text === '' : true;
    if (
      !isEdit &&
      e.key === 'ArrowUp' &&
      emptyText &&
      !loading &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    ) {
      const userMessages = currentChat?.messages.filter((message) => message.role === 'user') ?? [];
      const lastUser = userMessages[userMessages.length - 1];
      if (lastUser) {
        e.preventDefault();
        updateContext({ ...useAiStore.getState().context, input: lastUser.content });
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isEdit) {
        cancelMessageEdit();
      } else if (loading) {
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
    <Box sx={{ width: '100%', minWidth: 0, position: 'relative' }}>
      {mentionQuery !== null && (
        <Box sx={{ position: 'absolute', bottom: '100%', insetInlineStart: 0, zIndex: 10, mb: 1 }}>
          <ContextPicker
            options={mentionOptions}
            activeIndex={selectedOption}
            onPick={applyMention}
            onHover={setActiveOption}
          />
        </Box>
      )}
      <ChatTextInputStyled
        ref={editorRef}
        role='textbox'
        aria-multiline='true'
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-testid={isEdit ? 'ai-edit-input' : 'ai-chat-input'}
        data-empty='true'
        dir='auto'
        placeholder={locales.ask_anything}
        onInput={syncFromEditor}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          const root = editorRef.current;
          if (!root) return;
          const mention = mentionAtCaret(root);
          setMentionQuery(mention ? mention.query : null);
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const remove = target.closest('[data-testid="ai-context-chip-remove"]');
          if (remove) {
            e.preventDefault();
            remove.closest('[data-testid="ai-context-chip"]')?.remove();
            syncFromEditor();
            editorRef.current?.focus();
            return;
          }
          const root = editorRef.current;
          if (!root) return;
          const mention = mentionAtCaret(root);
          setMentionQuery(mention ? mention.query : null);
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          const sel = window.getSelection();
          if (!sel || !sel.rangeCount) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          syncFromEditor();
        }}
        onBlur={() => setMentionQuery(null)}
      />
    </Box>
  );
}

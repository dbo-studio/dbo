import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import DropDownMenu from '@/components/base/DropDownMenu/DropDownMenu';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import { useToggle } from 'usehooks-ts';
import type { ChatContextProps } from '../../types';
import { ChatContextHeaderStyled, ChatContextStyled, ChatContextTagsStyled } from './ChatContext.styled';
import ChatContextTarget from './ChatContextTarget';
import ChatContextItem from './ChatContextItem/ChatContextModalItem';
import ContextPicker from '../ContextPicker/ContextPicker';
import { buildContextOptions, toggleContextOption, type ContextOption } from '../../utils/contextOptions';
import { variables } from '@/core/theme/variables';

export default function ChatContext({ autocomplete }: ChatContextProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [isOpen, toggleOpen, setOpen] = useToggle(false);

  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);
  const autoContext = useAiStore((state) => state.autoContext);
  const setAutoContext = useAiStore((state) => state.setAutoContext);

  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(() => buildContextOptions(autocomplete, context, search), [autocomplete, context, search]);
  const active = Math.min(activeIndex, Math.max(options.length - 1, 0));

  const closePicker = () => {
    setOpen(false);
    setSearch('');
  };

  // The list stays open so several items can be attached in a row.
  const handlePick = (option: ContextOption) => updateContext(toggleContextOption(context, option));

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((active + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % Math.max(options.length, 1));
    } else if (e.key === 'Escape') {
      closePicker();
    } else if (e.key === 'Enter' && options[active]) {
      e.preventDefault();
      handlePick(options[active]);
    }
  };

  return (
    <ChatContextStyled>
      <ChatContextHeaderStyled>
        <ChatContextTarget autocomplete={autocomplete} />
        <Tooltip
          enterDelay={700}
          enterNextDelay={700}
          title={autoContext ? locales.ai_context_following_desc : locales.ai_context_pinned_desc}
        >
          <Chip
            size='small'
            variant={autoContext ? 'outlined' : 'filled'}
            icon={<CustomIcon type={autoContext ? 'refresh' : 'pin'} size='xs' />}
            label={autoContext ? locales.ai_context_following : locales.ai_context_pinned}
            onClick={() => setAutoContext(!autoContext)}
            data-testid='ai-context-follow'
            data-following={autoContext}
            sx={{ height: 20, fontSize: variables.fontSize.xs, flexShrink: 0 }}
          />
        </Tooltip>
      </ChatContextHeaderStyled>

      <ChatContextTagsStyled>
        <IconButton
          ref={anchorRef}
          onClick={toggleOpen}
          size='small'
          data-testid='ai-context-add'
          sx={{ width: 22, height: 22, p: 0 }}
        >
          <CustomIcon type='at' size='s' />
        </IconButton>

        {context.tables.map((item) => (
          <ChatContextItem
            type='tables'
            key={item}
            name={item}
            onClick={() => updateContext(toggleContextOption(context, { kind: 'table', label: item, attached: true }))}
          />
        ))}

        {context.views.map((item) => (
          <ChatContextItem
            type='views'
            key={item}
            name={item}
            onClick={() => updateContext(toggleContextOption(context, { kind: 'view', label: item, attached: true }))}
          />
        ))}

        {context.selectedQuery && (
          <ChatContextItem
            type='query'
            key='selection'
            name={`${locales.ai_context_selection}: ${context.selectedQuery.replace(/\s+/g, ' ').slice(0, 60)}`}
            onClick={() => updateContext({ ...context, selectedQuery: undefined })}
          />
        )}

        {context.querySnippet && (
          <ChatContextItem
            type='query'
            key='query-snippet'
            name={`${locales.context_query}: ${context.querySnippet}`}
            // An empty snippet means "removed": the editor query is not sent until it changes again.
            onClick={() => updateContext({ ...context, querySnippet: '' })}
          />
        )}

        {context.queryResultSummary && (
          <ChatContextItem
            type='query'
            key='query-result'
            name={locales.context_result}
            onClick={() => updateContext({ ...context, queryResultSummary: undefined })}
          />
        )}
      </ChatContextTagsStyled>
      <DropDownMenu open={isOpen} onClose={closePicker} anchorRef={anchorRef}>
        <ContextPicker
          options={options}
          activeIndex={active}
          onPick={handlePick}
          onHover={setActiveIndex}
          header={
            <Box sx={{ p: 0.5, pb: 0 }}>
              <FieldInput
                autoFocus
                fullWidth
                size='small'
                margin='none'
                placeholder={locales.ai_context_search}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                inputProps={{ 'data-testid': 'ai-context-search' }}
              />
            </Box>
          }
        />
      </DropDownMenu>
    </ChatContextStyled>
  );
}

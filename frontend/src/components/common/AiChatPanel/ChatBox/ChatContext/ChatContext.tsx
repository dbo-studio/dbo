import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, Chip, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import { useToggle } from 'usehooks-ts';
import type { ChatContextProps, ContextItemType } from '../../types';
import { ChatContextTagsStyled } from './ChatContext.styled';
import ChatContextItem from './ChatContextItem/ChatContextModalItem';
import ContextPicker from '../ContextPicker/ContextPicker';
import { buildContextOptions, toggleContextOption, type ContextOption } from '../../utils/contextOptions';
import { contextWindowOf, estimateContextTokens, formatTokens } from '../../utils/contextBudget';
import { variables } from '@/core/theme/variables';

export default function ChatContext({ autocomplete }: ChatContextProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [isOpen, toggleOpen, setOpen] = useToggle(false);

  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);
  const autoContext = useAiStore((state) => state.autoContext);
  const setAutoContext = useAiStore((state) => state.setAutoContext);
  const connection = useConnectionStore((state) => state.currentConnection());
  const activeProvider = useAiStore((state) => state.providers?.find((item) => item.isActive));

  const used = estimateContextTokens(context);
  const limit = contextWindowOf(activeProvider);

  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(() => buildContextOptions(autocomplete, context, search), [autocomplete, context, search]);
  const active = Math.min(activeIndex, Math.max(options.length - 1, 0));

  const handleContextChange = (name: string, type: ContextItemType) => {
    const kind = { database: 'database', schema: 'schema', tables: 'table', views: 'view' }[
      type
    ] as ContextOption['kind'];
    updateContext(toggleContextOption(context, { kind, label: name, attached: true }));
  };

  // The list stays open so several items can be attached in a row.
  const handlePick = (option: ContextOption) => updateContext(toggleContextOption(context, option));

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((active + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % Math.max(options.length, 1));
    } else if (e.key === 'Enter' && options[active]) {
      e.preventDefault();
      handlePick(options[active]);
    }
  };

  const targetDatabase =
    context.database || (connection && 'database' in connection.options ? connection.options.database : undefined);
  const target = [connection?.name, targetDatabase, context.schema].filter(Boolean).join(' · ');

  return (
    <Box>
      {target && (
        <Tooltip title={locales.ai_context_target_desc}>
          <Typography
            variant='caption'
            color='textSubdued'
            noWrap
            component='div'
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
            data-testid='ai-context-target'
          >
            <CustomIcon type='database' size='xs' />
            {target}
          </Typography>
        </Tooltip>
      )}
      <ChatContextTagsStyled direction={'row'} spacing={1}>
        <IconButton ref={anchorRef} onClick={toggleOpen}>
          <CustomIcon type='at' size='s' />
        </IconButton>

        <Tooltip title={autoContext ? locales.ai_context_following_desc : locales.ai_context_pinned_desc}>
          <Chip
            size='small'
            variant={autoContext ? 'outlined' : 'filled'}
            icon={<CustomIcon type={autoContext ? 'refresh' : 'pin'} size='xs' />}
            label={autoContext ? locales.ai_context_following : locales.ai_context_pinned}
            onClick={() => setAutoContext(!autoContext)}
            data-testid='ai-context-follow'
            data-following={autoContext}
            sx={{ height: 20, fontSize: variables.fontSize.xs }}
          />
        </Tooltip>

        {context.database !== undefined && context.database !== '' && (
          <ChatContextItem
            type='database'
            key={context.database}
            name={context.database}
            onClick={() => handleContextChange(context.database ?? '', 'database')}
          />
        )}

        {context.schema !== undefined && context.schema !== '' && (
          <ChatContextItem
            type='schema'
            key={context.schema}
            name={context.schema}
            onClick={() => handleContextChange(context.schema ?? '', 'schema')}
          />
        )}

        {context.tables.map((item) => (
          <ChatContextItem type='tables' key={item} name={item} onClick={() => handleContextChange(item, 'tables')} />
        ))}

        {context.views.map((item) => (
          <ChatContextItem type='views' key={item} name={item} onClick={() => handleContextChange(item, 'views')} />
        ))}

        {context.selectedQuery && (
          <ChatContextItem
            type='tables'
            key='selection'
            name={`${locales.ai_context_selection}: ${context.selectedQuery.replace(/\s+/g, ' ').slice(0, 60)}`}
            onClick={() => updateContext({ ...context, selectedQuery: undefined })}
          />
        )}

        {context.querySnippet && (
          <ChatContextItem
            type='tables'
            key='query-snippet'
            name={`${locales.context_query}: ${context.querySnippet}`}
            // An empty snippet means "removed": the editor query is not sent until it changes again.
            onClick={() => updateContext({ ...context, querySnippet: '' })}
          />
        )}

        {context.queryResultSummary && (
          <ChatContextItem
            type='tables'
            key='query-result'
            name={`${locales.context_result}: ${context.queryResultSummary}`}
            onClick={() => updateContext({ ...context, queryResultSummary: undefined })}
          />
        )}
        <Tooltip title={locales.ai_context_budget_desc}>
          <Typography
            variant='caption'
            color={used / limit > 0.8 ? 'warning.main' : 'textSubdued'}
            sx={{ ml: 'auto', whiteSpace: 'nowrap' }}
            data-testid='ai-context-budget'
          >
            {locales.ai_context_budget.replace('{used}', formatTokens(used)).replace('{limit}', formatTokens(limit))}
          </Typography>
        </Tooltip>
      </ChatContextTagsStyled>
      <Popover
        open={isOpen}
        anchorEl={anchorRef.current}
        onClose={() => {
          setOpen(false);
          setSearch('');
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 280 } } }}
      >
        <Box sx={{ p: 1, pb: 0 }}>
          <FieldInput
            autoFocus
            fullWidth
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
        <ContextPicker options={options} activeIndex={active} onPick={handlePick} onHover={setActiveIndex} />
      </Popover>
    </Box>
  );
}

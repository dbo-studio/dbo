import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import DropDownMenu from '@/components/base/DropDownMenu/DropDownMenu';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiContextType } from '@/types';
import { Box, Chip, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { useToggle } from 'usehooks-ts';
import type { ChatContextProps, ContextItemType } from '../../types';
import { ChatContextStyled, ChatContextTagsStyled } from './ChatContext.styled';
import ChatContextItem from './ChatContextItem/ChatContextModalItem';
import ChatContextModalItem from './ChatContextModalItem/ChatContextModalItem';
import { contextWindowOf, estimateContextTokens, formatTokens } from '../../utils/contextBudget';
import { variables } from '@/core/theme/variables';

export default function ChatContext({ autocomplete }: ChatContextProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [isOpen, toggleOpen, setOpen] = useToggle(false);

  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);
  const autoContext = useAiStore((state) => state.autoContext);
  const setAutoContext = useAiStore((state) => state.setAutoContext);
  const activeProvider = useAiStore((state) => state.providers?.find((item) => item.isActive));

  const used = estimateContextTokens(context);
  const limit = contextWindowOf(activeProvider);

  const [localContext, setLocalContext] = useState<AiContextType>({
    input: '',
    database: undefined,
    schema: undefined,
    tables: context.tables,
    views: context.views
  });

  const handleContextChange = (name: string, type: ContextItemType) => {
    const c = { ...localContext, input: context.input };
    switch (type) {
      case 'database':
      case 'schema':
        c[type] = c[type] === name ? undefined : name;
        break;
      case 'tables':
      case 'views':
        if (c[type]?.some((c: string) => c === name)) {
          c[type] = c[type].filter((c) => c !== name);
        } else {
          c[type] = [...(c[type] ?? []), name];
        }
        break;
    }

    setLocalContext(c);
    updateContext(c);
  };

  return (
    <Box>
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
            onClick={() => {}}
          />
        )}

        {context.queryResultSummary && (
          <ChatContextItem
            type='tables'
            key='query-result'
            name={`${locales.context_result}: ${context.queryResultSummary}`}
            onClick={() => {}}
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
      <DropDownMenu open={isOpen} onClose={() => setOpen(false)} anchorRef={anchorRef}>
        <ChatContextStyled>
          {autocomplete?.databases.map((database) => (
            <ChatContextModalItem
              key={`${database}-database`}
              name={database}
              type={'database'}
              isActive={localContext.database === database}
              onClick={handleContextChange}
            />
          ))}
          {autocomplete?.databases.length > 0 && <Divider sx={{ marginBottom: 1 }} />}
          {autocomplete?.schemas.map((schema) => (
            <ChatContextModalItem
              key={`${schema}-schema`}
              name={schema}
              type={'schema'}
              isActive={localContext.schema === schema}
              onClick={handleContextChange}
            />
          ))}
          {autocomplete?.schemas.length > 0 && <Divider sx={{ marginBottom: 1 }} />}
          {autocomplete?.tables.map((table) => (
            <ChatContextModalItem
              key={`${table}-table`}
              name={table}
              type={'tables'}
              isActive={localContext.tables?.some((c) => c === table) ?? false}
              onClick={handleContextChange}
            />
          ))}
          {autocomplete?.views.length > 0 && <Divider sx={{ marginBottom: 1 }} />}
          {autocomplete?.views.map((view) => (
            <ChatContextModalItem
              key={`${view}-view`}
              name={view}
              type={'views'}
              isActive={localContext.views?.some((c) => c === view) ?? false}
              onClick={handleContextChange}
            />
          ))}
        </ChatContextStyled>
      </DropDownMenu>
    </Box>
  );
}

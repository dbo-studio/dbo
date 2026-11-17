import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { IconButton, Tooltip } from '@mui/material';
import type { ChatContextProps } from '../../types';
import { ChatContextStyled, ChatContextTagsStyled } from './ChatContext.styled';
import ChatContextTarget from './ChatContextTarget';
import ChatContextItem from './ChatContextItem/ChatContextModalItem';
import { toggleContextOption } from '../../utils/contextOptions';

export default function ChatContext({ autocomplete }: ChatContextProps) {
  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);
  const autoContext = useAiStore((state) => state.autoContext);
  const setAutoContext = useAiStore((state) => state.setAutoContext);

  return (
    <ChatContextStyled>
      <ChatContextTagsStyled>
        <ChatContextTarget autocomplete={autocomplete} />

        <Tooltip
          enterDelay={700}
          enterNextDelay={700}
          title={autoContext ? locales.ai_context_following_desc : locales.ai_context_pinned_desc}
        >
          <IconButton
            aria-label={autoContext ? locales.ai_context_following : locales.ai_context_pinned}
            onClick={() => setAutoContext(!autoContext)}
            data-testid='ai-context-follow'
            data-following={autoContext}
            sx={{ width: 22, height: 22, p: 0, flexShrink: 0 }}
          >
            <CustomIcon type={autoContext ? 'refresh' : 'pin'} size='xs' />
          </IconButton>
        </Tooltip>

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
    </ChatContextStyled>
  );
}

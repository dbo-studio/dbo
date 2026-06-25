import { TabMode } from '@/core/enums';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useTabStore } from '@/store/tabStore/tab.store';

export type ChatPromptKey =
  | 'ai_prompt_explain_query'
  | 'ai_prompt_optimize_query'
  | 'ai_prompt_write_join'
  | 'ai_prompt_debug_error'
  | 'ai_prompt_list_tables'
  | 'ai_prompt_explore_schema';

export function getChatPromptSuggestions(): ChatPromptKey[] {
  const context = useAiStore.getState().context;
  const selectedTab = useTabStore.getState().selectedTab();

  const editorQuery =
    selectedTab?.mode === TabMode.Query ? (useTabStore.getState().getQuery(selectedTab.id) || '').trim() : '';

  const hasQuery = Boolean(context.selectedQuery?.trim() || context.querySnippet?.trim() || editorQuery);
  const hasError = Boolean(context.queryError?.trim());
  const hasSchemaContext = Boolean(
    context.database || context.schema || context.tables.length > 0 || context.views.length > 0
  );

  const suggestions: ChatPromptKey[] = [];

  if (hasQuery) {
    suggestions.push('ai_prompt_explain_query', 'ai_prompt_optimize_query');
  }

  if (hasSchemaContext || hasQuery) {
    suggestions.push('ai_prompt_write_join');
  }

  if (hasError) {
    suggestions.push('ai_prompt_debug_error');
  }

  if (suggestions.length === 0) {
    suggestions.push('ai_prompt_list_tables', 'ai_prompt_explore_schema');
  }

  return suggestions;
}

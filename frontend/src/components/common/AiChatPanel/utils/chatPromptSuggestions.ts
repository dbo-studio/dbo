import type { AiContextType } from '@/types';

export type ChatPromptKey =
  | 'ai_prompt_explain_query'
  | 'ai_prompt_optimize_query'
  | 'ai_prompt_write_join'
  | 'ai_prompt_list_tables'
  | 'ai_prompt_explore_schema';

export function getChatPromptSuggestions(context: AiContextType, editorQuery = ''): ChatPromptKey[] {
  const hasQuery = Boolean(context.selectedQuery?.trim() || context.querySnippet?.trim() || editorQuery.trim());
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

  if (suggestions.length === 0) {
    suggestions.push('ai_prompt_list_tables', 'ai_prompt_explore_schema');
  }

  return suggestions;
}

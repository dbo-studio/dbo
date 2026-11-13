import type { IconProps } from '@/components/base/CustomIcon/types';
import type { AiContextType } from '@/types';

export type ChatPromptKey =
  | 'ai_prompt_explain_query'
  | 'ai_prompt_optimize_query'
  | 'ai_prompt_write_join'
  | 'ai_prompt_list_tables'
  | 'ai_prompt_nosql_collections'
  | 'ai_prompt_nosql_find'
  | 'ai_prompt_nosql_indexes'
  | 'ai_prompt_redis_keys'
  | 'ai_prompt_redis_memory'
  | 'ai_prompt_explore_schema'
  | 'ai_prompt_write_sql'
  | 'ai_prompt_sql_basics';

export const CHAT_PROMPT_ICONS: Record<ChatPromptKey, IconProps['type']> = {
  ai_prompt_explain_query: 'about',
  ai_prompt_optimize_query: 'databaseZap',
  ai_prompt_write_join: 'structure',
  ai_prompt_list_tables: 'grid',
  ai_prompt_nosql_collections: 'grid',
  ai_prompt_nosql_find: 'search',
  ai_prompt_nosql_indexes: 'databaseZap',
  ai_prompt_redis_keys: 'grid',
  ai_prompt_redis_memory: 'databaseZap',
  ai_prompt_explore_schema: 'database',
  ai_prompt_write_sql: 'sql',
  ai_prompt_sql_basics: 'code'
};

/** Starters that don't need a live connection. */
export const NO_CONNECTION_PROMPTS: ChatPromptKey[] = ['ai_prompt_write_sql', 'ai_prompt_sql_basics'];

export type ChatEngine = 'sql' | 'mongo' | 'redis';

export function getChatPromptSuggestions(
  context: AiContextType,
  editorQuery = '',
  engine: ChatEngine = 'sql'
): ChatPromptKey[] {
  const hasQuery = Boolean(context.selectedQuery?.trim() || context.querySnippet?.trim() || editorQuery.trim());
  const hasSchemaContext = Boolean(
    context.database || context.schema || context.tables.length > 0 || context.views.length > 0
  );

  // MongoDB and Redis have no tables or joins, so their starters ask about collections, queries, indexes and keys.
  if (engine === 'mongo') {
    return hasQuery
      ? ['ai_prompt_explain_query', 'ai_prompt_optimize_query', 'ai_prompt_nosql_indexes']
      : ['ai_prompt_nosql_collections', 'ai_prompt_nosql_find', 'ai_prompt_nosql_indexes'];
  }

  if (engine === 'redis') {
    return ['ai_prompt_redis_keys', 'ai_prompt_redis_memory'];
  }

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

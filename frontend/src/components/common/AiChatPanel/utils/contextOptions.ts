import { TabMode } from '@/core/enums';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AiContextType, AutoCompleteType } from '@/types';
import { editor } from 'monaco-editor';

export type ContextOptionKind = 'query' | 'selection' | 'database' | 'schema' | 'table' | 'view';

export type ContextOption = {
  kind: ContextOptionKind;
  label: string;
  /** Text sent for query / selection options. */
  text?: string;
  attached: boolean;
};

export const CONTEXT_GROUP_LABEL: Record<ContextOptionKind, string> = {
  query: locales.ai_context_group_editor,
  selection: locales.ai_context_group_editor,
  database: locales.ai_context_group_databases,
  schema: locales.ai_context_group_schemas,
  table: locales.ai_context_group_tables,
  view: locales.ai_context_group_views
};

function editorSelection(): string {
  for (const instance of editor.getEditors()) {
    const selection = instance.getSelection();
    const model = instance.getModel();
    if (selection && !selection.isEmpty() && model) {
      return model.getValueInRange(selection);
    }
  }

  return '';
}

function activeQuery(): string {
  const tab = useTabStore.getState().selectedTab();
  return tab?.mode === TabMode.Query ? useTabStore.getState().getQuery(tab.id).trim() : '';
}

/** Everything the user can attach, filtered by the search text. */
export function buildContextOptions(
  autocomplete: AutoCompleteType | undefined,
  context: AiContextType,
  search: string
): ContextOption[] {
  const needle = search.trim().toLowerCase();
  const options: ContextOption[] = [];

  const query = activeQuery();
  if (query) {
    options.push({ kind: 'query', label: 'query', text: query, attached: Boolean(context.querySnippet) });
  }

  const selection = editorSelection().trim();
  if (selection) {
    options.push({ kind: 'selection', label: 'selection', text: selection, attached: Boolean(context.selectedQuery) });
  }

  if (autocomplete) {
    options.push(
      ...autocomplete.databases.map((label) => ({
        kind: 'database' as const,
        label,
        attached: context.database === label
      })),
      ...autocomplete.schemas.map((label) => ({ kind: 'schema' as const, label, attached: context.schema === label })),
      ...autocomplete.tables.map((label) => ({
        kind: 'table' as const,
        label,
        attached: context.tables.includes(label)
      })),
      ...autocomplete.views.map((label) => ({ kind: 'view' as const, label, attached: context.views.includes(label) }))
    );
  }

  return options.filter((option) => option.label.toLowerCase().includes(needle));
}

function toggled(names: string[], option: ContextOption): string[] {
  if (option.attached) return names.filter((name) => name !== option.label);

  return names.includes(option.label) ? names : [...names, option.label];
}

/** The context with the option attached, or detached when it already was. */
export function toggleContextOption(context: AiContextType, option: ContextOption): AiContextType {
  switch (option.kind) {
    case 'database':
      return { ...context, database: option.attached ? undefined : option.label };
    case 'schema':
      return { ...context, schema: option.attached ? undefined : option.label };
    case 'table':
      return {
        ...context,
        tables: toggled(context.tables, option)
      };
    case 'view':
      return {
        ...context,
        views: toggled(context.views, option)
      };
    case 'query':
      return { ...context, querySnippet: option.attached ? '' : option.text };
    case 'selection':
      return { ...context, selectedQuery: option.attached ? undefined : option.text };
  }
}

import type { ColumnType } from '@/types';
import type * as monaco from 'monaco-editor';
import { CompletionItemKind } from '../../SqlEditor/helpers/constants';

const prefixLabel = (languageId: string, text: string): string => {
  const prefix = languageId ? languageId.replace(/sql/gi, '').toLocaleLowerCase() : '';
  return prefix ? `${prefix}_${text}` : text;
};

let columns: ColumnType[] = [];

export function setConditionContext(c?: ColumnType[]) {
  columns = c ?? [];
}

export function getColumns(languageId: string): Omit<monaco.languages.CompletionItem, 'range'>[] {
  const columnCompletions = columns.map((c) => ({
    label: c.name,
    kind: CompletionItemKind.Field,
    detail: `column(${c.type})`,
    insertText: c.name,
    sortText: `1${prefixLabel(languageId, c.name)}`
  }));

  return columnCompletions;
}

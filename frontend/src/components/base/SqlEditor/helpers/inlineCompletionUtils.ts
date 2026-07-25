import type * as Monaco from 'monaco-editor';

export const MAX_PREFIX_CHARS = 4000;
export const MAX_SUFFIX_CHARS = 1000;

export type CompletionItemType = {
  insertText: string;
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
};

function stripCodeFences(text: string): string {
  let value = text.trim();
  if (value.startsWith('```sql')) value = value.slice(6);
  else if (value.startsWith('```SQL')) value = value.slice(6);
  else if (value.startsWith('```')) value = value.slice(3);
  if (value.endsWith('```')) value = value.slice(0, -3);
  return value.trim();
}

function trimPrefixOverlap(prefix: string, completion: string): string {
  const maxOverlap = Math.min(prefix.length, completion.length);
  for (let i = maxOverlap; i > 0; i--) {
    if (prefix.endsWith(completion.slice(0, i))) {
      return completion.slice(i);
    }
  }
  return completion;
}

function trimSuffixOverlap(completion: string, suffix: string): string {
  const maxOverlap = Math.min(completion.length, suffix.length);
  for (let i = maxOverlap; i > 0; i--) {
    const tail = completion.slice(completion.length - i);
    if (suffix.startsWith(tail)) {
      return completion.slice(0, completion.length - i);
    }
  }
  return completion;
}

export function sanitizeInlineCompletion(prefix: string, suffix: string, completion: string): string {
  let value = stripCodeFences(completion);
  if (!value) return '';

  value = trimPrefixOverlap(prefix, value);

  if (suffix) {
    const suffixIndex = value.indexOf(suffix);
    if (suffixIndex >= 0) {
      value = value.slice(0, suffixIndex);
    }
    value = trimSuffixOverlap(value, suffix);
  }

  const paragraphBreak = value.indexOf('\n\n');
  if (paragraphBreak >= 0) {
    value = value.slice(0, paragraphBreak);
  }

  return value.trimEnd();
}

function windowText(text: string, maxChars: number, fromEnd = false): string {
  if (text.length <= maxChars) return text;
  return fromEnd ? text.slice(-maxChars) : text.slice(0, maxChars);
}

export function createCompletionItem(text: string, position: Monaco.Position): CompletionItemType {
  return {
    insertText: text,
    range: {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    }
  };
}

export function getTextRange(model: Monaco.editor.ITextModel, position: Monaco.Position) {
  const fullPrefix = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  });

  const fullSuffix = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: model.getLineCount(),
    endColumn: model.getLineMaxColumn(model.getLineCount())
  });

  return {
    prefix: windowText(fullPrefix, MAX_PREFIX_CHARS, true),
    suffix: windowText(fullSuffix, MAX_SUFFIX_CHARS, false)
  };
}

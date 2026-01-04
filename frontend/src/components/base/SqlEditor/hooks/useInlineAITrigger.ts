import type * as Monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { DEBOUNCE_DELAYS } from '../helpers/constants';

export function useInlineAITrigger(editor: Monaco.editor.IStandaloneCodeEditor | null): void {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const disposable = editor.onDidChangeModelContent(() => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        try {
          const text = editor.getValue() ?? '';
          if (text.trim().length === 0) {
            return;
          }
          editor.trigger('inlineAI', 'editor.action.inlineSuggest.trigger', {});
        } catch {
          /* noop */
        }
      }, DEBOUNCE_DELAYS.inlineAITrigger);
    });

    return () => {
      disposable.dispose();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [editor]);
}

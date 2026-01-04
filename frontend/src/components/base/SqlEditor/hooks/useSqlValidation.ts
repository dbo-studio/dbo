import type * as Monaco from 'monaco-editor';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { DEBOUNCE_DELAYS } from '../helpers/constants';
import { errorsToMarkers, validateSql } from '../helpers/sqlValidator';

export function useSqlValidation(editor: Monaco.editor.IStandaloneCodeEditor | null, value: string): void {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editor || !value) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      try {
        const errors = validateSql(value);
        const markers = errorsToMarkers(errors);
        monaco.editor.setModelMarkers(model, 'sql-validator', markers);
      } catch (error) {
        console.debug('🚀 ~ useSqlValidation ~ error:', error);
      }
    }, DEBOUNCE_DELAYS.sqlValidation);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [editor, value]);
}

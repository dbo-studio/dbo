import type { SqlEditorProps } from '@/components/base/SqlEditor/types.ts';
import * as monaco from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';

import { shortcuts } from '@/core/utils/shortcuts.ts';
import { useShortcut } from '@/hooks/useShortcut.hook.ts';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { Box } from '@mui/material';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { changeMetaProviderSetting } from './helpers/dbMetaProvider.ts';
import { editorConfig } from './helpers/editorConfig.ts';

export default function SqlEditor({ autocomplete, value, onChange, onBlur, onMount }: SqlEditorProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const [mount, setMount] = useState(false);
  const { isDark } = useSettingStore();
  const selectedTabId = useTabStore((state) => state.selectedTabId);

  const { runRawQuery } = useDataStore();

  if (selectedTabId) {
    useShortcut(shortcuts.runQuery, () => runRawQuery());
  }

  useEffect(() => {
    if (hostRef.current && !editorRef.current) {
      editorRef.current = monaco.editor.create(hostRef.current, {
        ...editorConfig,
        theme: isDark ? 'github-dark' : 'github-light',
        language: LanguageIdEnum.PG
      });
    }

    const model = editorRef.current?.getModel();

    editorRef.current?.addAction({
      id: shortcuts.runQuery.command,
      keybindings: shortcuts.runQuery.monaco,
      run: (): Promise<void> => runRawQuery(editorRef.current?.getValue()),
      label: shortcuts.runQuery.label
    });

    model?.onDidChangeContent(() => {
      const currentValue = editorRef.current?.getValue();
      if (currentValue && currentValue !== value.toString()) {
        onChange?.(currentValue);
      }
    });

    editorRef.current?.onDidBlurEditorText(() => {
      const currentValue = editorRef.current?.getValue();
      if (currentValue && currentValue !== value.toString()) {
        onBlur?.(currentValue);
      }
    });

    setMount(true);
  }, [selectedTabId]);

  useEffect(() => {
    if (editorRef.current && value.toString() !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        theme: isDark ? 'github-dark' : 'github-light'
      });
    }
  }, [isDark]);

  useEffect(() => {
    changeMetaProviderSetting(autocomplete);
  }, [autocomplete]);

  useEffect(() => {
    if (editorRef.current && mount && onMount) {
      onMount();
    }
  }, [editorRef.current, mount]);

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        visibility: mount ? 'visible' : 'hidden',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        msUserSelect: 'text',
        '& *': {
          userSelect: 'text',
          WebkitUserSelect: 'text',
          msUserSelect: 'text'
        }
      }}
      ref={hostRef}
    />
  );
}

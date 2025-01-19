import type {CodeEditorProps} from '@/components/base/CodeEditor/types.ts';
import * as monaco from 'monaco-editor';
import {LanguageIdEnum} from 'monaco-sql-languages';

import {shortcuts} from '@/core/utils/shortcuts.ts';
import {useShortcut} from '@/hooks/useShortcut.hook.ts';
import {useDataStore} from '@/store/dataStore/data.store.ts';
import {useSettingStore} from '@/store/settingStore/setting.store.ts';
import {useEffect, useRef, useState} from 'react';
import {changeMetaProviderSetting} from './helpers/dbMetaProvider.ts';
import {editorConfig} from './helpers/editorConfig.ts';
import './helpers/languageSetup.ts';
import {useTabStore} from '@/store/tabStore/tab.store.ts';
import {Box} from '@mui/material';

export default function CodeEditor({ autocomplete, value, onChange }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const [mount, setMount] = useState(false);
  const { isDark } = useSettingStore();
  const { getSelectedTab } = useTabStore();
  const { runRawQuery } = useDataStore();

  useShortcut(shortcuts.runQuery, () => runRawQuery());

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
      run: () => runRawQuery(),
      label: shortcuts.runQuery.label
    });

    model?.onDidChangeContent(() => {
      onChange(model.getValue());
    });

    setMount(true);
  }, [getSelectedTab()?.id]);

  useEffect(() => {
    if (editorRef.current) {
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

import type { CodeEditorProps } from '@/components/base/CodeEditor/types.ts';
import * as monaco from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';

import { shortcuts } from '@/core/utils/shortcuts.ts';
import { useShortcut } from '@/hooks/useShortcut.hook.ts';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { useEffect, useRef, useState } from 'react';
import { changeMetaProviderSetting } from './helpers/dbMetaProvider.ts';
import { editorConfig } from './helpers/editorConfig.ts';
import './helpers/languageSetup.ts';

export default function CodeEditor({ autocomplete, value, onChange }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const [mount, setMount] = useState(false);
  const { isDark } = useSettingStore();
  const { runRawQuery } = useDataStore();
  const { getQuery } = useTabStore();
  const { getSelectedTab } = useTabStore();

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
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setValue(getQuery());
    }
    //todo: check if works
  }, [getSelectedTab()?.id]);

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

  return <div style={{ height: '100%', width: '100%', visibility: mount ? 'visible' : 'hidden' }} ref={hostRef} />;
}

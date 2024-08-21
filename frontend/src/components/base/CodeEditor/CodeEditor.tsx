import { CodeEditorProps } from '@/components/base/CodeEditor/types.ts';
import * as monaco from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';

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
  const { selectedTab, getQuery } = useTabStore();

  useEffect(() => {
    if (hostRef.current && !editorRef.current) {
      editorRef.current = monaco.editor.create(hostRef.current, {
        ...editorConfig,
        theme: isDark ? 'github-dark' : 'github-light',
        language: LanguageIdEnum.PG
      });
    }

    const model = editorRef.current?.getModel();
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
  }, [selectedTab?.id]);

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

  return <div style={{ height: '100%', width: '100%', visibility: mount ? 'visible' : 'hidden' }} ref={hostRef}></div>;
}

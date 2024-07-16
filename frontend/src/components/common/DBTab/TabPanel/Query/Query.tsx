import { CodeEditorSettingType } from '@/components/base/CodeEditorV2/types';
import { useState } from 'react';
import QueryEditor from './QueryEditor/QueryEditor';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

export default function Query() {
  const [setting, setSetting] = useState<CodeEditorSettingType>({
    database: '',
    schema: ''
  });

  const handleChangeQueryEditorSettings = (data: CodeEditorSettingType) => {
    setSetting(data);
  };

  return (
    <>
      <QueryEditorActionBar onChange={handleChangeQueryEditorSettings} />
      <QueryEditor setting={setting} />
    </>
  );
}

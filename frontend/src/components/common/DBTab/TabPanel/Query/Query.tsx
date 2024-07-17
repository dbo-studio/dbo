import api from '@/api';
import { AutoCompleteRequestType } from '@/api/query/types';
import { CodeEditorSettingType } from '@/components/base/CodeEditorV2/types';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { AutoCompleteType } from '@/types';
import { useEffect, useState } from 'react';
import QueryEditor from './QueryEditor/QueryEditor';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

export default function Query() {
  const { currentConnection } = useConnectionStore();
  const [setting, setSetting] = useState<CodeEditorSettingType>({
    database: '',
    schema: ''
  });

  const [autocomplete, setAutocomplete] = useState<AutoCompleteType | null>(null);

  const { request: getAutoComplete, pending: pending } = useAPI({
    apiMethod: api.query.autoComplete
  });

  const handleChangeQueryEditorSettings = (data: CodeEditorSettingType) => {
    setSetting(data);
  };

  useEffect(() => {
    if (!currentConnection || pending || setting.schema == '' || setting.database == '') {
      return;
    }

    getAutoComplete({
      connection_id: currentConnection.id,
      schema: setting.schema,
      database: setting.database,
      from_cache: true
    } as AutoCompleteRequestType).then((res) => {
      setAutocomplete(res);
    });
  }, [setting]);

  return (
    <>
      <QueryEditorActionBar onChange={handleChangeQueryEditorSettings} />
      {autocomplete && <QueryEditor autocomplete={autocomplete} />}
    </>
  );
}

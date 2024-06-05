import useAPI from '@/hooks/useApi.hook';
import api from '@/src/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useEffect } from 'react';
import QueryEditor from './QueryEditor/QueryEditor';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

export default function Query() {
  const { currentConnection } = useConnectionStore();
  const { autoComplete, updateAutocomplete } = useDataStore();
  const { request: getAutoComplete } = useAPI({
    apiMethod: api.query.autoComplete
  });

  const handleGetAutocomplete = async () => {
    try {
      const res = await getAutoComplete({
        connection_id: currentConnection?.id,
        database: currentConnection?.currentDatabase
      });
      updateAutocomplete(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!autoComplete) {
      handleGetAutocomplete();
    }
  }, []);

  return (
    <>
      <QueryEditorActionBar />
      <QueryEditor />
    </>
  );
}

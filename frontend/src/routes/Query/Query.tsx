import api from '@/api';
import type { AutoCompleteRequestType } from '@/api/query/types';
import type { CodeEditorSettingType } from '@/components/base/CodeEditor/types';
import { useWindowSize } from '@/hooks';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AutoCompleteType } from '@/types';
import { Box, useTheme } from '@mui/material';
import { Suspense, lazy, useEffect, useState } from 'react';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

const CodeEditor = lazy(() => import('@/components/base/CodeEditor/CodeEditor'));
const DBDataGrid = lazy(() => import('@/components/shared/DBDataGrid/DBDataGrid'));

export default function Query() {
  const theme = useTheme();
  const { currentConnection } = useConnectionStore();
  const windowSize = useWindowSize();
  const { getQuery, updateQuery } = useTabStore();
  const [autocomplete, setAutocomplete] = useState<AutoCompleteType | null>(null);
  const [value, setValue] = useState('');
  const [setting, setSetting] = useState<CodeEditorSettingType>({
    database: '',
    schema: ''
  });

  const { request: getAutoComplete, pending } = useAPI({
    apiMethod: api.query.autoComplete
  });

  useEffect(() => {
    if (autocomplete || !currentConnection || pending) {
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
  }, [setting, currentConnection]);

  useEffect(() => {
    handleChangeValue();
  }, []);

  const handleChangeValue = () => {
    setValue(getQuery());
  };

  const handleUpdateState = (value: string) => {
    updateQuery(value);
  };

  return (
    <>
      <QueryEditorActionBar onFormat={() => handleChangeValue()} onChange={setSetting} />
      <Box display={'flex'} flexDirection={'column'} height={windowSize.height}>
        <Box display={'flex'} minHeight={'0'} flex={1} borderBottom={`1px solid ${theme.palette.divider}`}>
          {autocomplete && (
            <Suspense>
              <CodeEditor onChange={handleUpdateState} autocomplete={autocomplete} value={value} />
            </Suspense>
          )}
        </Box>
        {autocomplete && (
          <Suspense fallback={<Box display={'flex'} flex={1} />}>
            <DBDataGrid />
          </Suspense>
        )}
      </Box>
    </>
  );
}

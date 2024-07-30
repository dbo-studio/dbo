import api from '@/api';
import { AutoCompleteRequestType } from '@/api/query/types';
import { CodeEditorSettingType } from '@/components/base/CodeEditor/types';
import { useMount, useWindowSize } from '@/hooks';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { AutoCompleteType } from '@/types';
import { Box, useTheme } from '@mui/material';
import { lazy, Suspense, useEffect, useState } from 'react';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

const CodeEditor = lazy(() => import('@/components/base/CodeEditor/CodeEditor'));
const DBDataGrid = lazy(() => import('@/components/shared/DBDataGrid/DBDataGrid'));

export default function Query() {
  const theme = useTheme();
  const mounted = useMount();
  const { currentConnection } = useConnectionStore();
  const windowSize = useWindowSize();
  const { getRows } = useDataStore();
  const { updateSelectedTab, selectedTab } = useTabStore();
  const [autocomplete, setAutocomplete] = useState<AutoCompleteType | null>(null);
  const [value, setValue] = useState('');
  const [setting, setSetting] = useState<CodeEditorSettingType>({
    database: '',
    schema: ''
  });

  const { request: getAutoComplete, pending: pending } = useAPI({
    apiMethod: api.query.autoComplete
  });

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
  }, [setting, currentConnection]);

  useEffect(() => {
    handleChangeValue();
  }, []);

  const handleChangeValue = () => {
    setValue(selectedTab?.query ?? '');
  };

  const handleUpdateState = (value: string) => {
    updateSelectedTab({
      ...selectedTab!,
      query: value ?? ''
    });
  };

  return (
    <>
      <QueryEditorActionBar onFormat={() => handleChangeValue()} onChange={setSetting} />
      <Box display={'flex'} flexDirection={'column'} height={windowSize.height}>
        <Suspense>
          {autocomplete && (
            <Box display={'flex'} minHeight={'0'} flex={1} borderBottom={`1px solid ${theme.palette.divider}`}>
              <CodeEditor onChange={handleUpdateState} autocomplete={autocomplete} value={value} />
            </Box>
          )}
        </Suspense>
        {mounted && <Suspense>{getRows() && getRows().length > 0 && <DBDataGrid />}</Suspense>}
      </Box>
    </>
  );
}
